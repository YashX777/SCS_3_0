// ChatScreen.js

import React, { useState, useRef, useEffect } from 'react'; // <-- Added useEffect
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- DB Imports ---
// <-- NEW: Import your database functions
import { getDBConnection, getAllTransactions } from '../utils/db.js'; // Adjust path if needed

// --- API Configuration ---
const API_KEY = 'AIzaSyAk8bAoNXRC-X7aeJehbk5JSZhHk8Hp7MM';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// --- Financial Analyzer (JavaScript equivalent of financial_analyzer.py) ---
// <-- NEW: These functions are back, but will use data from your SQLite DB

/**
 * Formats a number into the Indian Rupee (INR) currency string.
 */
const formatToINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

/**
 * Calculates a financial summary for a given date range.
 * @param {Array} df - The array of transaction objects.
 * @param {Date} startDate - The start of the period.
 * @param {Date} endDate - The end of the period.
 * @returns {object} - A summary object.
 */
function getSummary(df, startDate, endDate) {
  // Set end date to the end of the day
  endDate.setHours(23, 59, 59, 999);
  
  const periodDf = df.filter((t) => {
    // We already converted date strings to Date objects when loading from DB
    return t.date >= startDate && t.date <= endDate;
  });

  if (periodDf.length === 0) {
    return {
      total_income: '₹0.00',
      total_expense: '₹0.00',
      net_flow: '₹0.00',
      transaction_count: 0,
    };
  }

  const totalIncome = periodDf
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = periodDf
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0); // This will be a negative sum

  const netFlow = totalIncome + totalExpense;

  return {
    total_income: formatToINR(totalIncome),
    total_expense: formatToINR(Math.abs(totalExpense)),
    net_flow: formatToINR(netFlow),
    transaction_count: periodDf.length,
  };
}

/**
 * Calculates the summary for the current week (Mon-Sun).
 * @param {Array} df - The array of transaction objects.
 * @returns {object} - A summary object for the week.
 */
function getWeeklySummary(df) {
  // Use Oct 26, 2025 as "today" to match the prompt's context
  const today = new Date('2025-10-26T12:00:00Z'); 
  
  const jsDay = today.getDay(); // 0 for Sunday
  const pyWeekday = jsDay === 0 ? 6 : jsDay - 1; // Convert to Mon=0...Sun=6

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - pyWeekday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  console.log(
    `Calculating weekly summary from ${startOfWeek.toDateString()} to ${endOfWeek.toDateString()}...`
  );
  return getSummary(df, startOfWeek, endOfWeek);
}

/**
 * Calculates the summary for the current month.
 * @param {Array} df - The array of transaction objects.
 * @returns {object} - A summary object for the month.
 */
function getMonthlySummary(df) {
  // Use Oct 26, 2025 as "today"
  const today = new Date('2025-10-26T12:00:00Z');
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Day 0 of next month

  console.log(
    `Calculating monthly summary from ${startOfMonth.toDateString()} to ${endOfMonth.toDateString()}...`
  );
  return getSummary(df, startOfMonth, endOfMonth);
}

/**
 * Converts the transaction data into a string for the LLM prompt.
 * @param {Array} df - The array of transaction objects.
 * @returns {string} - A string representation of the data.
 */
function getDataAsString(df) {
  if (!df || df.length === 0) {
    return 'No data available.';
  }
  // Convert Date objects back to ISO strings for consistent stringify
  const cleanData = df.map(t => ({
    ...t,
    date: t.date.toISOString(),
  }));
  const header = Object.keys(cleanData[0]);
  const records = cleanData.map((row) => Object.values(row));
  
  return `Header: ${JSON.stringify(header)}\nData: ${JSON.stringify(records)}`;
}

// --- React Native Component ---

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Financial Assistant is ready! Try 'weekly summary', 'monthly summary', or ask a question.",
      sender: 'bot',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]); // <-- NEW: State to hold DB data
  const flatListRef = useRef(null);

  // <-- NEW: Load data from SQLite database when the component first opens
  useEffect(() => {
    const loadDataFromDB = async () => {
      try {
        console.log('Attempting to load data from SQLite...');
        const db = await getDBConnection();
        const dbData = await getAllTransactions(db);

        // --- CRITICAL STEP ---
        // Convert date strings from DB back into Date objects
        // so our getSummary() functions can work with them.
        const cleanedData = dbData.map((t) => ({
          ...t,
          date: new Date(t.date), 
        }));
        
        setTransactions(cleanedData);
        console.log(`Successfully loaded ${cleanedData.length} transactions.`);
        
        if (cleanedData.length === 0) {
           setMessages((prev) => [
            ...prev,
             { id: 'db_empty', text: 'Note: Your local database is empty. I can only answer general questions.', sender: 'bot' },
          ]);
        }
        
      } catch (error) {
        console.error('Failed to load data from database:', error);
        setMessages((prev) => [
          ...prev,
          { id: 'db_error', text: 'Error: Could not load data from your local database.', sender: 'bot' },
        ]);
      }
    };

    loadDataFromDB();
  }, []); // The empty array [] means this runs only once when the component mounts.

  /**
   * Handles sending a message, processing it, and getting a response.
   */
  const handleSend = async () => {
    if (inputText.trim().length === 0) return;

    const userMessage = {
      id: String(Date.now()),
      text: inputText,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const lowerInput = inputText.toLowerCase();
      let summaryData = null;
      let prompt_for_llm = '';

      // --- This logic is now identical to your Python script ---
      // It uses the 'transactions' state variable, which is filled from your SQLite DB
      if (
        lowerInput.includes('weekly summary') ||
        lowerInput.includes('this week')
      ) {
        summaryData = getWeeklySummary(transactions); // <-- Uses data from DB
        prompt_for_llm = `Please present this weekly financial summary in a friendly, easy-to-read format. Your response must be in plain text. Do not use markdown formatting. The amounts are in Indian Rupees: ${JSON.stringify(
          summaryData
        )}`;
      } else if (
        lowerInput.includes('monthly summary') ||
        lowerInput.includes('this month')
      ) {
        summaryData = getMonthlySummary(transactions); // <-- Uses data from DB
        prompt_for_llm = `Please present this monthly financial summary in a friendly, easy-to-read format. Your response must be in plain text. Do not use markdown formatting. The amounts are in Indian Rupees: ${JSON.stringify(
          summaryData
        )}`;
      } else {
        const data_context_string = getDataAsString(transactions); // <-- Uses data from DB
        prompt_for_llm = `
          You are a helpful financial assistant. Today is October 26, 2025.
          Based on the following data, please answer the user's question.
          IMPORTANT: All monetary amounts in the data are in Indian Rupees (INR).
          Please display all financial answers with the '₹' symbol.
          Your response must be in plain text. Do not use markdown formatting.
          
          Data: ${data_context_string}
          Question: ${inputText}
        `;
      }

      // --- Call Gemini API ---
      console.log('Sending prompt to Gemini...');
      const result = await model.generateContent(prompt_for_llm);
      const response = await result.response;
      const botText = response.text();

      const botMessage = {
        id: String(Date.now() + 1),
        text: botText,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error generating content:', error);
      const errorMessage = {
        id: String(Date.now() + 1),
        text: 'Sorry, I ran into an error. Please try again.',
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Renders a single chat message bubble.
   */
  const renderItem = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessage : styles.botMessage,
      ]}>
      <Text
        style={
          item.sender === 'user' ? styles.userMessageText : styles.botMessageText
        }>
        {item.text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={90}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.chatArea}
          contentContainerStyle={{ paddingBottom: 10 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <ActivityIndicator
            style={styles.loadingIndicator}
            size="small"
            color="#007AFF"
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about your finances..."
            placeholderTextColor="#8e8e93"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              isLoading && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={isLoading}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---
// (Styles are identical to the previous version, no changes)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f8',
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageContainer: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginVertical: 5,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  botMessage: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  userMessageText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  botMessageText: {
    color: '#000000',
    fontSize: 16,
  },
  loadingIndicator: {
    marginVertical: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#D1D1D6',
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    height: 40,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#F7F7F7',
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 40,
  },
  sendButtonDisabled: {
    backgroundColor: '#A9A9A9',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});