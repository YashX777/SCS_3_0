import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { UserContext } from '../contexts/UserContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { getDBConnection, createTransactionsTable, getAllTransactions } from '../utils/db';
// ...existing code...

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const { user } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  const styles = themedStyles(theme);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadTx() {
      try {
        const db = await getDBConnection();
        await createTransactionsTable(db);
        const rows = await getAllTransactions(db);
        if (!mounted) return;
        // Normalize rows: ensure amount is number and date is YYYY-MM-DD
        const normalizeDate = (d) => {
          if (!d) return '';
          try {
            const dt = new Date(d);
            if (isNaN(dt.getTime())) {
              const s = String(d);
              const m = s.match(/\d{4}-\d{2}-\d{2}/);
              return m ? m[0] : s.slice(0,10);
            }
            return dt.toISOString().slice(0,10);
          } catch {
            return String(d).slice(0,10);
          }
        };

        const normalized = rows.map(r => ({
          id: r.id,
          sms_id: r.sms_id,
          // ensure a YYYY-MM-DD string so month slicing and grouping works
          date: normalizeDate(r.date),
          amount: Number(r.amount) || 0,
          type: r.type,
          description: r.description,
          category: r.category || 'Other',
        }));
        // Ensure newest transactions are first (by date, then id)
        normalized.sort((a, b) => {
          const ta = new Date(a.date).getTime() || 0;
          const tb = new Date(b.date).getTime() || 0;
          if (tb !== ta) return tb - ta; // newer dates first
          return (b.id || 0) - (a.id || 0);
        });
        setTransactions(normalized);
      } catch (e) {
        console.warn('HomeScreen loadTx error:', e);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }
    loadTx();
    return () => { mounted = false; };
  }, []);

  // --- Aggregation helpers ---
  // Monthly summary
  const getMonthlySummary = (txs, months = 6) => {
    if (!txs.length) return { labels: [], income: [], expense: [] };
    const now = new Date();
    const monthsArr = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsArr.push({ key, label: d.toLocaleString(undefined, { month: 'short' }) });
    }
    const income = monthsArr.map(m => 0);
    const expense = monthsArr.map(m => 0);
    txs.forEach(tx => {
      const mKey = tx.date?.slice(0,7);
      const idx = monthsArr.findIndex(m => m.key === mKey);
      if (idx >= 0) {
        if (tx.type === 'credit') income[idx] += tx.amount;
        if (tx.type === 'debit') expense[idx] += tx.amount;
      }
    });
    return { labels: monthsArr.map(m=>m.label), income, expense };
  };

  // Weekly summary across the last N weeks (broadened from current month)
  const getWeeklySummary = (txs, weeks = 8) => {
    if (!txs.length) return { labels: [], cumulative: [], budget: [] };
    const now = new Date();
    // Compute starts for the last weeks weeks (starting on Sunday)
    const currWeekStart = new Date(now);
    currWeekStart.setDate(now.getDate() - now.getDay());
    currWeekStart.setHours(0,0,0,0);
    const weekStarts = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date(currWeekStart);
      d.setDate(currWeekStart.getDate() - i * 7);
      weekStarts.push(d);
    }

    const weekGroups = {};
    weekStarts.forEach(d => { weekGroups[d.toISOString().slice(0,10)] = { expense: 0, income: 0 }; });

    // Populate groups with transactions that fall inside these weeks
    txs.forEach(tx => {
      if (!tx.date) return;
      const dt = new Date(tx.date);
      if (isNaN(dt.getTime())) return;
      const weekStart = new Date(dt);
      weekStart.setDate(dt.getDate() - dt.getDay());
      weekStart.setHours(0,0,0,0);
      const key = weekStart.toISOString().slice(0,10);
      if (!weekGroups[key]) return; // outside our window
      if (tx.type === 'debit') weekGroups[key].expense += tx.amount;
      if (tx.type === 'credit') weekGroups[key].income += tx.amount;
    });

    const weekKeys = weekStarts.map(d => d.toISOString().slice(0,10));
    const weeklyExpense = weekKeys.map(k => weekGroups[k]?.expense || 0);
    const cumulative = [];
    let sum = 0;
    weeklyExpense.forEach(e => { sum += e; cumulative.push(sum); });

    // Budget: estimate using first week's income and avg spending ratio across the window
    const firstWeekIncome = weekGroups[weekKeys[0]]?.income || 0;
    const totalDebit = weekKeys.reduce((s, k) => s + (weekGroups[k]?.expense || 0), 0);
    const totalCredit = weekKeys.reduce((s, k) => s + (weekGroups[k]?.income || 0), 0) || 1;
    const avgSpendingRatio = totalDebit / totalCredit;
    const budget = cumulative.map(() => firstWeekIncome * avgSpendingRatio);

    // Turn labels into short readable strings (e.g., "01 Oct")
    const labels = weekKeys.map(k => {
      const d = new Date(k);
      return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString(undefined, { month: 'short' })}`;
    });

    return { labels, cumulative, budget };
  };

  // Category breakdown across the last N months (broadened)
  const getCategoryBreakdown = (txs, monthsBack = 3) => {
    if (!txs.length) return [];
    const now = new Date();
    // Start from the first day of the month monthsBack-1 months ago
    const cutoff = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    const txsWindow = txs.filter(tx => {
      if (!tx.date) return false;
      const dt = new Date(tx.date);
      if (isNaN(dt.getTime())) return false;
      return dt >= cutoff && tx.type === 'debit';
    });
    const map = {};
    txsWindow.forEach(tx => {
      const cat = tx.category || 'Other';
      map[cat] = (map[cat] || 0) + tx.amount;
    });
    return Object.keys(map).map((k,i) => ({ name: k, amount: map[k] })).sort((a,b)=>b.amount-a.amount);
  };

  // Full monthly summary across all months (like SCS.py)
  const getFullMonthlySummary = (txs, monthsBack = 12) => {
    if (!txs.length) return [];
    const map = {};
    txs.forEach(tx => {
      if (!tx.date) return;
      const key = tx.date.slice(0,7); // YYYY-MM
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      if (tx.type === 'credit') map[key].income += tx.amount;
      if (tx.type === 'debit') map[key].expense += tx.amount;
    });
    const keys = Object.keys(map).sort();
    // Take last monthsBack months
    const sliceKeys = keys.slice(-monthsBack);
    return sliceKeys.map(k => {
      const inc = map[k].income || 0;
      const exp = map[k].expense || 0;
      const ratio = inc === 0 ? 0 : (exp / inc) * 100;
      return { month: k, income: inc, expense: exp, spendingRatio: ratio };
    });
  };

  // Weekly summary for the current month (mirrors SCS.py output)
  const getWeeklyCurrentMonthSummary = (txs) => {
    if (!txs.length) return { weekly: [], alerts: [], firstWeekIncome: 0, estimatedBudget: 0 };
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const txsCurrent = txs.filter(tx => tx.date?.slice(0,7) === monthKey);
    if (!txsCurrent.length) return { weekly: [], alerts: [], firstWeekIncome: 0, estimatedBudget: 0 };

    // Past months for avg spending ratio
    const pastMap = {};
    txs.forEach(tx => {
      if (!tx.date) return;
      const key = tx.date.slice(0,7);
      if (key === monthKey) return;
      if (!pastMap[key]) pastMap[key] = { income: 0, expense: 0 };
      if (tx.type === 'credit') pastMap[key].income += tx.amount;
      if (tx.type === 'debit') pastMap[key].expense += tx.amount;
    });
    const pastKeys = Object.keys(pastMap);
    let avgSpendingRatio = 0.8;
    if (pastKeys.length) {
      const ratios = pastKeys.map(k => {
        const inc = pastMap[k].income || 0;
        const exp = pastMap[k].expense || 0;
        return inc === 0 ? 0 : (exp / inc);
      }).filter(r => r > 0);
      if (ratios.length) avgSpendingRatio = ratios.reduce((s,a)=>s+a,0) / ratios.length;
    }

    // First week income based on earliest date in current month
    const dates = txsCurrent.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()));
    const minDate = new Date(Math.min(...dates));
    const firstWeekEnd = new Date(minDate);
    firstWeekEnd.setDate(minDate.getDate() + 6);
    const firstWeekIncome = txsCurrent.filter(t => new Date(t.date) <= firstWeekEnd && t.type === 'credit')
      .reduce((s,t)=>s+t.amount,0);

    const monthlyBudgetEst = firstWeekIncome * avgSpendingRatio;

    // Group by week_start / week_end
    const weekMap = {};
    txsCurrent.forEach(tx => {
      const dt = new Date(tx.date);
      if (isNaN(dt.getTime())) return;
      const weekStart = new Date(dt);
      weekStart.setDate(dt.getDate() - dt.getDay());
      weekStart.setHours(0,0,0,0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const key = weekStart.toISOString().slice(0,10);
      if (!weekMap[key]) weekMap[key] = { week_start: weekStart, week_end: weekEnd, weeklyExpense: 0 };
      if (tx.type === 'debit') weekMap[key].weeklyExpense += tx.amount;
    });

    const weekKeys = Object.keys(weekMap).sort();
    const weeklyArr = weekKeys.map(k => ({
      week_start: weekMap[k].week_start.toISOString().slice(0,10),
      week_end: weekMap[k].week_end.toISOString().slice(0,10),
      weeklyExpense: weekMap[k].weeklyExpense,
    }));

    // Compute cumulative and remaining
    let cum = 0;
    const weeklyWithCumulative = weeklyArr.map(w => {
      cum += w.weeklyExpense;
      const remaining = monthlyBudgetEst - cum;
      return { ...w, cumulativeExpense: cum, remainingBudget: remaining, estimatedBudget: monthlyBudgetEst, firstWeekIncome };
    });

    // Alerts
    const weeklyAlerts = weeklyWithCumulative.map(w => {
      let msg = `Week ${w.week_start} - ${w.week_end} (Month: ${monthKey}): Weekly expenditure ₹${w.weeklyExpense.toFixed(2)}, Estimated monthly budget ₹${w.estimatedBudget.toFixed(2)} (first week income ₹${w.firstWeekIncome.toFixed(2)}), Remaining budget ₹${w.remainingBudget.toFixed(2)}`;
      if (w.remainingBudget < 0) msg += ' You have exceeded your estimated monthly budget! Please adjust spending.';
      return msg;
    });

    return { weekly: weeklyWithCumulative, alerts: weeklyAlerts, firstWeekIncome, estimatedBudget: monthlyBudgetEst };
  };

  // Budget alerts (current month)
  const getBudgetAlerts = (weekly) => {
    if (!weekly.labels.length) return [];
    return weekly.labels.map((wk, i) => {
      const rem = (weekly.budget[i] || 0) - (weekly.cumulative[i] || 0);
      let msg = `Week starting ${wk}: Cumulative expense ₹${weekly.cumulative[i]?.toFixed(2)}, Estimated budget ₹${weekly.budget[i]?.toFixed(2)}, Remaining budget ₹${rem.toFixed(2)}`;
      if (rem < 0) msg += ' — You have exceeded your estimated monthly budget!';
      return msg;
    });
  };

  // Chart data
  const monthly = getMonthlySummary(transactions, 6);
  const weekly = getWeeklySummary(transactions, 8); // last 8 weeks
  const categories = getCategoryBreakdown(transactions, 3); // last 3 months
  const alerts = getBudgetAlerts(weekly);

  // Extra SCS-style summaries
  const fullMonthly = getFullMonthlySummary(transactions, 12); // monthly summary across all months
  const weeklyCurrentSummary = getWeeklyCurrentMonthSummary(transactions); // SCS-like current month weekly data

  // Ensure monthly summary is visible: fallback to aggregated monthly if fullMonthly is empty
  const monthlyRows = (() => {
    if (fullMonthly && fullMonthly.length) {
      // Convert month YYYY-MM into readable label
      return fullMonthly.map(m => ({
        month: m.month,
        label: (() => {
          try { const d = new Date(m.month + '-01'); return d.toLocaleString(undefined, { month: 'short', year: 'numeric' }); } catch { return m.month; }
        })(),
        income: m.income,
        expense: m.expense,
        ratio: m.spendingRatio,
      }));
    }
    // Fallback: derive from getMonthlySummary for last 12 months
    const agg = getMonthlySummary(transactions, 12);
    if (!agg.labels || !agg.labels.length) return [];
    return agg.labels.map((label, i) => ({ month: label, label, income: agg.income[i] || 0, expense: agg.expense[i] || 0, ratio: agg.income[i] ? (agg.expense[i] / agg.income[i]) * 100 : 0 }));
  })();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 80}}>
      <Text style={styles.greeting}>Hello, {user?.name || 'Friend'} 👋</Text>
      <Text style={styles.sub}>Here's a quick snapshot of your financial analysis.</Text>

      {loading ? (
        <ActivityIndicator size="large" style={{marginTop:40}} color={theme === 'dark' ? '#fff' : '#000'} />
      ) : (
        <View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Monthly Income vs Expenses</Text>
            {monthly.labels.length ? (
              <LineChart
                data={{
                  labels: monthly.labels,
                  datasets: [
                    { data: monthly.income, color: () => '#4caf50', strokeWidth: 2 },
                    { data: monthly.expense, color: () => '#f44336', strokeWidth: 2 },
                  ],
                  legend: ['Income', 'Expense'],
                }}
                width={Math.max(screenWidth - 32, 220)}
                height={220}
                yAxisLabel={'₹'}
                chartConfig={{
                  backgroundColor: theme === 'dark' ? '#111' : '#fff',
                  backgroundGradientFrom: theme === 'dark' ? '#111' : '#fff',
                  backgroundGradientTo: theme === 'dark' ? '#111' : '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => theme === 'dark' ? `rgba(255,255,255,${opacity})` : `rgba(33,150,243,${opacity})`,
                  labelColor: () => theme === 'dark' ? '#ddd' : '#666',
                  propsForDots: { r: '4', strokeWidth: '2', stroke: '#2196f3' },
                }}
                style={{ borderRadius: 12 }}
              />
            ) : (
              <Text style={styles.note}>No monthly data available yet.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Weekly Cumulative Expenses vs Budget</Text>
            {weekly.labels.length ? (
              <LineChart
                data={{
                  labels: weekly.labels,
                  datasets: [
                    { data: weekly.cumulative, color: () => '#2196f3', strokeWidth: 2 },
                    { data: weekly.budget, color: () => '#f44336', strokeWidth: 2 },
                  ],
                  legend: ['Cumulative Expense', 'Estimated Budget'],
                }}
                width={Math.max(screenWidth - 32, 220)}
                height={180}
                yAxisLabel={'₹'}
                chartConfig={{
                  backgroundColor: theme === 'dark' ? '#111' : '#fff',
                  backgroundGradientFrom: theme === 'dark' ? '#111' : '#fff',
                  backgroundGradientTo: theme === 'dark' ? '#111' : '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => theme === 'dark' ? `rgba(255,255,255,${opacity})` : `rgba(33,150,243,${opacity})`,
                  labelColor: () => theme === 'dark' ? '#ddd' : '#666',
                  propsForDots: { r: '4', strokeWidth: '2', stroke: '#2196f3' },
                }}
                style={{ borderRadius: 12 }}
              />
            ) : (
              <Text style={styles.note}>No weekly data available yet.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Spending by Category (Pie)</Text>
            {categories.length ? (
              <PieChart
                data={categories.slice(0,6).map((c,i) => ({
                  name: c.name,
                  population: Math.round(c.amount),
                  color: ['#4caf50','#f44336','#2196f3','#ff9800','#9c27b0','#607d8b'][i % 6],
                  legendFontColor: theme === 'dark' ? '#ddd' : '#333',
                  legendFontSize: 12,
                }))}
                width={Math.max(screenWidth - 32, 220)}
                height={160}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="10"
              />
            ) : (
              <Text style={styles.note}>No categorized spending yet.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Budget Alerts</Text>
            {alerts.length ? (
              <View style={styles.alertList}>
                <ScrollView nestedScrollEnabled={true} contentContainerStyle={{ paddingVertical: 4 }}>
                  {alerts.map((msg, i) => {
                    const exceeded = String(msg).toLowerCase().includes('exceed');
                    return (
                      <View
                        key={i}
                        style={[
                          styles.alertItem,
                          { backgroundColor: exceeded ? (theme === 'dark' ? '#4a1414' : '#ffebee') : (theme === 'dark' ? '#112233' : '#e8f4ff') }
                        ]}
                      >
                        <View style={[styles.alertPill, { backgroundColor: exceeded ? '#f44336' : '#2196f3' }]} />
                        <Text style={[styles.alertText, { color: exceeded ? (theme === 'dark' ? '#fff' : '#b71c1c') : (theme === 'dark' ? '#cfe9ff' : '#0b486b') }]}>{msg}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <Text style={styles.note}>No alerts for this month.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Monthly Summary (last 12 months)</Text>
            {fullMonthly.length ? (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, { fontWeight: '700' }]}>Month</Text>
                  <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: '700' }]}>Income</Text>
                  <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: '700' }]}>Expense</Text>
                  <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: '700' }]}>Ratio</Text>
                </View>
                {fullMonthly.map((m) => (
                  <View key={m.month} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{m.month}</Text>
                    <Text style={styles.tableCellNumber}>₹{Math.round(m.income)}</Text>
                    <Text style={styles.tableCellNumber}>₹{Math.round(m.expense)}</Text>
                    <Text style={[styles.tableCellNumber, { fontSize: 12 }]}>{m.spendingRatio.toFixed(1)}%</Text>
                  </View>
                )).reverse()}
              </>
            ) : (
              <Text style={styles.note}>No monthly summary available yet.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Weekly Summary (Current Month)</Text>
            {weeklyCurrentSummary.weekly.length ? (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, { fontWeight: '700' }]}>Week</Text>
                  <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: '700' }]}>Weekly</Text>
                  <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: '700' }]}>Cumulative</Text>
                </View>
                {weeklyCurrentSummary.weekly.map((w) => (
                  <View key={w.week_start} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{w.week_start} → {w.week_end}</Text>
                    <Text style={styles.tableCellNumber}>₹{Math.round(w.weeklyExpense)}</Text>
                    <Text style={styles.tableCellNumber}>₹{Math.round(w.cumulativeExpense)}</Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.note}>No weekly summary for current month.</Text>
            )}
            <View style={{ marginTop: 8 }}>
              {weeklyCurrentSummary.alerts && weeklyCurrentSummary.alerts.length ? (
                weeklyCurrentSummary.alerts.map((a, i) => (
                  <Text key={i} style={[styles.note, { textAlign: 'left' }]} numberOfLines={2}>{a}</Text>
                ))
              ) : null}
            </View>
          </View>

          <Text style={styles.note}>Tip: Tap Transactions to fetch SMS-based transactions (Android requires permission).</Text>
          <View style={[styles.card, { marginTop: 8 }]}> 
            <Text style={styles.sectionTitle}>Debug Info</Text>
            <Text style={styles.note}>Transactions loaded: {transactions.length}</Text>
            <Text style={styles.note}>Categories (this month): {categories.length}</Text>
            <Text style={styles.note}>Weekly groups: {weekly.labels.length}</Text>
            <Text style={styles.note} numberOfLines={5}>Sample row: {transactions[0] ? JSON.stringify(transactions[0]) : '—'}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const themedStyles = (theme) =>
  StyleSheet.create({
    container: { 
      flex: 1, 
      padding: 16, 
      backgroundColor: theme === 'dark' ? '#111' : '#fafafa',
      paddingBottom: 80, // Add space for bottom navigation
    },
    greeting: { 
      fontSize: 24, 
      fontWeight: '700', 
      color: theme === 'dark' ? '#fff' : '#111',
      marginTop: 8,
    },
    sub: { 
      color: theme === 'dark' ? '#ddd' : '#444', 
      marginBottom: 20,
      fontSize: 15,
    },
    card: { 
      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff', 
      padding: 20, 
      borderRadius: 12, 
      marginBottom: 16,
      shadowColor: theme === 'dark' ? '#000' : '#888',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    cardTitle: { 
      color: theme === 'dark' ? '#bbb' : '#666',
      fontSize: 15,
    },
    cardAmount: { 
      marginTop: 8, 
      fontSize: 28, 
      fontWeight: '700', 
      color: theme === 'dark' ? '#fff' : '#111' 
    },
    note: { 
      marginTop: 24, 
      color: '#888', 
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    chartContainer: {
      marginBottom: 16,
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme === 'dark' ? '#ddd' : '#333',
      marginBottom: 8,
    },
    cardSub: {
      color: theme === 'dark' ? '#bbb' : '#555',
      fontSize: 12,
    },
    alertList: {
      maxHeight: 180,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme === 'dark' ? '#222' : '#eee',
      marginBottom: 6,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: theme === 'dark' ? '#222' : '#f0f0f0',
      alignItems: 'center',
    },
    tableCell: {
      flex: 1,
      color: theme === 'dark' ? '#ddd' : '#333',
    },
    tableCellNumber: {
      flex: 1,
      textAlign: 'right',
      color: theme === 'dark' ? '#fff' : '#111',
      fontWeight: '600',
    },
    alertItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 10,
      marginVertical: 6,
    },
    alertPill: {
      width: 10,
      height: 40,
      borderRadius: 6,
      marginRight: 12,
    },
    alertText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },
    rowItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: theme === 'dark' ? '#222' : '#eee',
    },
    rowTitle: {
      color: theme === 'dark' ? '#fff' : '#111',
      flex: 1,
      marginRight: 8,
    },
    rowAmount: {
      fontWeight: '600',
      color: theme === 'dark' ? '#fff' : '#111',
    },
  });