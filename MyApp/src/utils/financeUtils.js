// Loads and parses financial_summary.json (output from SCS.py)
// Provides helpers for HomeScreen charts and summary UI
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const summaryPath = Platform.OS === 'android'
  ? FileSystem.documentDirectory + 'financial_summary.json'
  : FileSystem.bundleDirectory + 'financial_summary.json';

export async function loadFinancialSummary() {
  try {
    // Try reading from app bundle first, fallback to document directory
    let jsonStr = '';
    try {
      jsonStr = await FileSystem.readAsStringAsync(summaryPath);
    } catch (e) {
      // fallback: try local assets (if bundled)
      jsonStr = await FileSystem.readAsStringAsync(FileSystem.documentDirectory + 'financial_summary.json');
    }
    const data = JSON.parse(jsonStr);
    return data;
  } catch (e) {
    console.warn('Could not load financial_summary.json:', e);
    return null;
  }
}

// Helper: get monthly summary for charts
export function getMonthlyChartData(summary) {
  if (!summary || !summary.monthly_summary) return { labels: [], income: [], expense: [], ratio: [] };
  const labels = summary.monthly_summary.map(m => m.Month);
  const income = summary.monthly_summary.map(m => m.Income);
  const expense = summary.monthly_summary.map(m => m.Expense);
  const ratio = summary.monthly_summary.map(m => m['Spending Ratio (%)']);
  return { labels, income, expense, ratio };
}

// Helper: get weekly summary for charts
export function getWeeklyChartData(summary) {
  if (!summary || !summary.weekly_summary) return { labels: [], weekly: [], cumulative: [], budget: [] };
  const labels = summary.weekly_summary.map(w => w.week_start);
  const weekly = summary.weekly_summary.map(w => w['Weekly Expense']);
  const cumulative = summary.weekly_summary.map(w => w['Cumulative Expense']);
  const budget = summary.weekly_summary.map(w => w['Estimated Budget']);
  return { labels, weekly, cumulative, budget };
}

// Helper: get alerts
export function getWeeklyAlerts(summary) {
  return summary?.weekly_alerts || [];
}

// Helper: get category breakdown for pie chart (current month)
export function getCurrentMonthCategoryPie(summary) {
  // Not present in JSON, but you can add it in SCS.py if needed
  // For now, return empty
  return [];
}