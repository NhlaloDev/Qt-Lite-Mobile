import React, { useEffect, useState } from "react";
import {
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { FIRESTORE_DB, FIREBASE_AUTH } from "@/FirebaseConfig"; // Firebase Firestore and Auth imports
import { collection, onSnapshot } from "firebase/firestore"; // Firestore query imports
import { IncomeType } from "@/types";
import Colors from "@/constants/Colors";
import { DollarIcon, WalletAddMoneyIcon, WalletCardIcon } from "@/constants/Icons";

const IncomeBlock = () => {
  const [financeData, setFinanceData] = useState<IncomeType[]>([]);
  const [loading, setLoading] = useState(true); // Loading state

  // Fetch finance details from the transactions collection
  useEffect(() => {
    const currentUser = FIREBASE_AUTH.currentUser;
    if (currentUser) {
      // Fetch the user's transactions collection
      const transactionsCollection = collection(FIRESTORE_DB, `system_users/${currentUser.uid}/transactions`);

      // Real-time listener to fetch the transactions
      const unsubscribe = onSnapshot(transactionsCollection, (snapshot) => {
        const transactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Calculate total income, total expenses, and net profit
        let totalIncome = 0;
        let totalExpenses = 0;

        transactions.forEach((transaction: any) => {
          if (transaction.category === "Income") {
            totalIncome += parseFloat(transaction.amount);
          } else if (transaction.category === "Expense") {
            totalExpenses += parseFloat(transaction.amount);
          }
        });

        const netProfit = totalIncome - totalExpenses;

        // Prepare the finance data for display
        const financeData = [
          { name: "Income", amount: totalIncome.toFixed(2) },
          { name: "Expense", amount: totalExpenses.toFixed(2) },
          { name: "Net Profit", amount: netProfit.toFixed(2) },
        ];

        setFinanceData(financeData);
        setLoading(false); // Stop loading once data is fetched
      });

      return () => unsubscribe(); // Cleanup listener on component unmount
    } else {
      setLoading(false);
    }
  }, []);

  const renderItem: ListRenderItem<IncomeType> = ({ item }) => {
    let icon = <DollarIcon width={22} height={22} color={Colors.white} />;
    if (item.name === "Income") {
      icon = <WalletCardIcon width={22} height={22} color={Colors.white} />;
    } else if (item.name === "Expense") {
      icon = <WalletAddMoneyIcon width={22} height={22} color={Colors.white} />;
    } else if (item.name === "Net Profit") {
      icon = <WalletAddMoneyIcon width={22} height={22} color={Colors.white} />;
    }

    let amount = item.amount.split(".");
    return (
      <View
        style={{
          backgroundColor: Colors.grey,
          padding: 20,
          borderRadius: 20,
          marginRight: 15,
          width: 150,
          gap: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View
            style={{
              borderColor: "#666",
              borderWidth: 1,
              borderRadius: 50,
              padding: 5,
              alignSelf: "flex-start",
            }}
          >
            {icon}
          </View>
          <TouchableOpacity onPress={() => {}}>
            <Feather name="more-horizontal" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={{ color: Colors.white }}>{item.name}</Text>
        <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "600" }}>
          R{amount[0]}.
          <Text style={{ fontSize: 12, fontWeight: "400" }}>{amount[1]}</Text>
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  return (
    <View>
      <Text style={{ color: Colors.white, fontSize: 16, marginBottom: 20 }}>
        My <Text style={{ fontWeight: "700" }}>Finances</Text>
      </Text>
      <FlatList
        data={financeData}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

export default IncomeBlock;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
