// import React, { useEffect, useState } from "react";
// import { StyleSheet, View, Text, FlatList, ActivityIndicator } from "react-native";
// import { FIRESTORE_DB, FIREBASE_AUTH } from '@/FirebaseConfig';
// import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
// import { onAuthStateChanged } from 'firebase/auth';
// import moment from 'moment';

// // Define the Transaction type
// interface Transaction {
//   id: string;
//   transactionType: string;
//   amount: number;
//   createdAt?: any; // Optional to handle missing createdAt fields
// }

// const Transactions = () => {
//   const [transactions, setTransactions] = useState<Transaction[]>([]); // Define state with Transaction type
//   const [loading, setLoading] = useState(true);
//   const [userName, setUserName] = useState('');
//   const [userID, setUserID] = useState('');

//   useEffect(() => {
//     const unsubscribeAuth = onAuthStateChanged(FIREBASE_AUTH, async (authUser) => {
//       if (authUser) {
//         const userId = authUser.uid;

//         // Fetch the user's name from Firestore
//         const userDocRef = doc(FIRESTORE_DB, 'system_users', userId);
//         const userDoc = await getDoc(userDocRef);
//         if (userDoc.exists()) {
//           setUserName(userDoc.data()?.name);
//           setUserID(userDoc.data()?.id);
//         }

//         // Fetch transactions from the 'transactions' sub-collection under the specific user
//         const transactionsRef = collection(FIRESTORE_DB, `system_users/${userId}/transactions`);
//         const q = query(transactionsRef);

//         const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
//           if (snapshot.empty) {
//             // No transactions available
//             setTransactions([]); // Set an empty array if there are no transactions
//           } else {
//             const transactionsData = snapshot.docs.map((doc) => ({
//               id: doc.id,
//               ...doc.data(),
//             }));
//             setTransactions(transactionsData); // Update transactions state
//           }
//           setLoading(false); // Turn off loading after fetching
//         });

//         return () => unsubscribeTransactions();
//       } else {
//         setLoading(false); // In case there's no authenticated user
//       }
//     });

//     return () => unsubscribeAuth();
//   }, []);

//   const renderTransaction = ({ item }: { item: Transaction }) => (
//     <View style={styles.itemContainer}>
//       <Text style={styles.itemTitle}>{item.transactionType}</Text>
//       <Text style={styles.itemAmount}>R{item.amount}</Text>
//       <Text style={styles.itemDate}>
//         {item.createdAt && item.createdAt.toDate
//           ? moment(item.createdAt.toDate()).format('MMMM Do YYYY, h:mm a')
//           : 'Date not available'}
//       </Text>
//     </View>
//   );

//   if (loading) {
//     return (
//       <View style={styles.loader}>
//         <ActivityIndicator size="large" color="#4CAF50" />
//       </View>
//     );
//   }

//   return (
//     <View style={{ flex: 1 }}>
//       {transactions.length > 0 ? (
//         <FlatList
//           data={transactions}
//           renderItem={renderTransaction}
//           keyExtractor={(item) => item.id}
//           contentContainerStyle={styles.container}
//         />
//       ) : (
//         <View style={styles.emptyContainer}>
//           <Text style={styles.emptyText}>No Transactions Found</Text>
//         </View>
//       )}
//     </View>
//   );
// };

// export default Transactions;

// const styles = StyleSheet.create({
//   container: {
//     padding: 10,
//   },
//   itemContainer: {
//     padding: 15,
//     marginVertical: 10,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: "#D0D0D0",
//     backgroundColor: "#333",
//   },
//   itemTitle: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#fff",
//     marginBottom: 5,
//   },
//   itemAmount: {
//     fontSize: 14,
//     marginBottom: 5,
//     color: "#fff",
//   },
//   itemDate: {
//     fontSize: 12,
//     color: "#fff",
//   },
//   loader: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   emptyText: {
//     color: "#fff",
//     fontSize: 18,
//   },
// });
import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, ScrollView} from "react-native";
import { FIRESTORE_DB, FIREBASE_AUTH } from '@/FirebaseConfig';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import moment from 'moment';

interface Transaction {
  id: string;
  transactionType: string;
  itemName: string;
  category: string;
  amount: number;
  createdAt?: any;
  customerName: string ;
  customerPhone: string;
  customerAge: number;
  customerGender: string;
  customerLocation: string;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userID, setUserID] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(FIREBASE_AUTH, async (authUser) => {
      if (authUser) {
        const userId = authUser.uid;
        setUserID(userId);

        // Fetch transactions from the 'transactions' sub-collection under the specific user
        const transactionsRef = collection(FIRESTORE_DB, `system_users/${userId}/transactions`);
        const q = query(transactionsRef);

        const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
          const transactionsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Transaction[];
          setTransactions(transactionsData);
          setLoading(false);
        });

        return () => unsubscribeTransactions();
      }
    });
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(FIRESTORE_DB, `system_users/${userID}/transactions`, id));
      Alert.alert('Deleted', 'Transaction deleted successfully');
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  const handleEdit = (id: string) => {
    router.push({ pathname: '/pages/TransactionForm', params: { transactionId: id } });
  };

  if (loading) {
    return <ActivityIndicator size="large" color={Colors.blue} />;
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.transactionContainer}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionText}>Type: {item.transactionType}</Text>
            <Text style={styles.transactionText}>Item: {item.itemName}</Text>
            <Text style={styles.transactionText}>Financial Category: {item.category}</Text>
            <Text style={styles.transactionText}>Amount: R{item.amount}</Text>
            <Text style={styles.transactionText}>
              Date: {item.createdAt ? moment(item.createdAt.toDate()).format('YYYY-MM-DD') : 'N/A'}
            </Text>
            <Text style={styles.transactionText}>Customer Name: {item.customerName}</Text>
            <Text style={styles.transactionText}>Customer Age: {item.customerAge}</Text>
            <Text style={styles.transactionText}>Customer Gender: {item.customerGender}</Text>
            <Text style={styles.transactionText}>Customer Phone: {item.customerPhone}</Text>
            <Text style={styles.transactionText}>Customer Location: {item.customerLocation}</Text>
          </View>

          <View style={styles.iconContainer}>
            {/* Edit Button */}
            <TouchableOpacity onPress={() => handleEdit(item.id)}>
              <MaterialIcons name="edit" size={24} color={Colors.white} />
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <MaterialIcons name="delete" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
};

export default Transactions;

const styles = StyleSheet.create({
  transactionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    alignItems: 'center',
    padding: 10,
    width: '95%',
    marginVertical: 5,
    borderRadius: 10,
    borderColor: '#fff',
    backgroundColor: Colors.grey,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionText: {
    color: Colors.white,
    fontSize: 16,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 80,
  },
});
