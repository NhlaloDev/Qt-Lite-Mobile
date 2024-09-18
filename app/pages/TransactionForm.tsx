import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { FIRESTORE_DB, FIREBASE_AUTH } from '@/FirebaseConfig';
import { doc, getDoc, collection, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useRouter, useLocalSearchParams } from 'expo-router';

const TransactionForm = () => {
  const router = useRouter();
  const { transactionId } = useLocalSearchParams();

  const [businessSector, setBusinessSector] = useState<string>('');
  const [transactionType, setTransactionType] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [itemList, setItemList] = useState([]);
  const [amount, setAmount] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [category, setCategory] = useState<string>('');
  const [openTransactionType, setOpenTransactionType] = useState<boolean>(false);
  const [openCategory, setOpenCategory] = useState<boolean>(false);
  const [openItem, setOpenItem] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Customer Information
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAge, setCustomerAge] = useState<string>('');
  const [customerGender, setCustomerGender] = useState<string>('');
  const [customerLocation, setCustomerLocation] = useState<string>('');

  const transactionCategories = useMemo(() => [
    { label: 'Income', value: 'Income' },
    { label: 'Expense', value: 'Expense' },
  ], []);

  const serviceTransactions = useMemo(() => [
    { label: 'Service Booking', value: 'Service Booking' },
    { label: 'Service Completion', value: 'Service Completion' },
    { label: 'Service Payment', value: 'Service Payment' },
    { label: 'Service Quotation', value: 'Service Quotation' },
    { label: 'Service Feedback', value: 'Service Feedback' },
    { label: 'Recurring Service Setup', value: 'Recurring Service Setup' },
    { label: 'Invoice Generation', value: 'Invoice Generation' },
  ], []);

  const productTransactions = useMemo(() => [
    { label: 'Product Order', value: 'Product Order' },
    { label: 'Product Delivery', value: 'Product Delivery' },
    { label: 'Product Stock Update', value: 'Product Stock Update' },
    { label: 'Product Payment', value: 'Product Payment' },
    { label: 'Return/Refund', value: 'Return/Refund' },
    { label: 'Discount Application', value: 'Discount Application' },
    { label: 'Purchase Order Generation', value: 'Purchase Order Generation' },
  ], []);

  useEffect(() => {
    const fetchBusinessSectorAndInventory = async () => {
      const currentUser = FIREBASE_AUTH.currentUser;
      if (currentUser) {
        const userDocRef = doc(FIRESTORE_DB, 'system_users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setBusinessSector(userData.business_sector);

          if (userData.business_sector === 'Services') {
            setTransactionTypes(serviceTransactions);
            const serviceRef = collection(FIRESTORE_DB, `system_users/${currentUser.uid}/inventory`);
            onSnapshot(serviceRef, (snapshot) => {
              const serviceData = snapshot.docs.map((doc) => ({
                label: doc.data().itemName,
                value: doc.id,
                price: doc.data().price,
              }));
              setItemList(serviceData);
            });
          } else if (userData.business_sector === 'Products') {
            setTransactionTypes(productTransactions);
            const inventoryRef = collection(FIRESTORE_DB, `system_users/${currentUser.uid}/inventory`);
            onSnapshot(inventoryRef, (snapshot) => {
              const productData = snapshot.docs.map((doc) => ({
                label: doc.data().itemName,
                value: doc.id,
                price: doc.data().price,
                availableQuantity: doc.data().quantity,
              }));
              setItemList(productData);
            });
          }
        } else {
          Alert.alert('Error', 'User data not found.');
        }
      } else {
        Alert.alert('Error', 'No user is logged in.');
      }
    };

    fetchBusinessSectorAndInventory();

    if (transactionId) {
      setIsEditing(true);
      setLoading(true);
      fetchTransactionDetails(transactionId);
    } else {
      setIsEditing(false);
    }
  }, [transactionId, serviceTransactions, productTransactions]);

  const fetchTransactionDetails = async (transactionId: string) => {
    const currentUser = FIREBASE_AUTH.currentUser;
    if (currentUser) {
      const transactionDocRef = doc(FIRESTORE_DB, `system_users/${currentUser.uid}/transactions`, transactionId);
      const transactionDoc = await getDoc(transactionDocRef);
      if (transactionDoc.exists()) {
        const transactionData = transactionDoc.data();
        setTransactionType(transactionData.transactionType);
        setAmount(transactionData.amount.toString());
        setQuantity(transactionData.quantity?.toString() || '');
        setSelectedItem(transactionData.itemId);
        setCategory(transactionData.category || '');

        setCustomerName(transactionData.customerName || '');
        setCustomerPhone(transactionData.customerPhone || '');
        setCustomerAge(transactionData.customerAge || '');
        setCustomerGender(transactionData.customerGender || '');
        setCustomerLocation(transactionData.customerLocation || '');

        setLoading(false);
      } else {
        setLoading(false);
        Alert.alert('Error', 'Transaction not found.');
      }
    }
  };

  const handleItemSelection = useCallback((value: string) => {
    const selected = itemList.find((item) => item.value === value);
    setSelectedItem(value);
    setAmount(selected?.price?.toString() || '');
  }, [itemList]);

  const saveTransaction = async () => {
    if (!transactionType || !amount || !category || !customerName || !customerPhone || (businessSector === 'Services' && !selectedItem)) {
        Alert.alert('Error', `Please fill in all required fields. Business Sector: ${amount}`);
      return;
    }

    try {
      const currentUser = FIREBASE_AUTH.currentUser;
      if (currentUser) {
        const userTransactionsRef = collection(FIRESTORE_DB, `system_users/${currentUser.uid}/transactions`);
        const transactionData = {
          businessSector,
          transactionType,
          itemName: itemList.find((item) => item.value === selectedItem)?.label || '',
          itemId: selectedItem,
          amount: parseFloat(amount),
          quantity: parseInt(quantity),
          category,
          createdAt: new Date(),
          customerName,
          customerPhone,
          customerAge,
          customerGender,
          customerLocation,
        };

        if (isEditing) {
          const transactionDocRef = doc(FIRESTORE_DB, `system_users/${currentUser.uid}/transactions`, transactionId);
          await updateDoc(transactionDocRef, transactionData);
          Alert.alert('Success', 'Transaction updated successfully.');
        } else {
          await addDoc(userTransactionsRef, transactionData);
          Alert.alert('Success', 'Transaction added successfully.');
        }

        if (businessSector === 'Products') {
          const newQuantity = itemList.find((item) => item.value === selectedItem).availableQuantity - parseInt(quantity);
          const itemDocRef = doc(FIRESTORE_DB, `system_users/${currentUser.uid}/inventory`, selectedItem);
          await updateDoc(itemDocRef, { quantity: newQuantity });
        }

        router.push('/');
      } else {
        Alert.alert('Error', 'No user is logged in.');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save transaction.');
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <>
            <Text style={styles.title}>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</Text>

            {/* Transaction Type Dropdown */}
            <View style={{ zIndex: 1000 }}>
              <Text style={styles.label}>Transaction Type</Text>
              <DropDownPicker
                open={openTransactionType}
                value={transactionType}
                items={transactionTypes}
                setOpen={setOpenTransactionType}
                setValue={setTransactionType}
                setItems={setTransactionTypes}
                placeholder="Select a transaction type"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
              />
            </View>

            {/* Product/Service Dropdown */}
            <View style={{ zIndex: 900 }}>
              <Text style={styles.label}>{businessSector === 'Products' ? 'Product' : 'Service'}</Text>
              <DropDownPicker
                open={openItem}
                value={selectedItem}
                items={itemList}
                setOpen={setOpenItem}
                setValue={handleItemSelection}
                setItems={setItemList}
                placeholder={`Select a ${businessSector === 'Products' ? 'product' : 'service'}`}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
              />
            </View>

            {/* Category Dropdown (Income/Expense) */}
            <View style={{ zIndex: 800 }}>
              <Text style={styles.label}>Transaction Category</Text>
              <DropDownPicker
                open={openCategory}
                value={category}
                items={transactionCategories}
                setOpen={setOpenCategory}
                setValue={setCategory}
                placeholder="Select Income or Expense"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
              />
            </View>
        <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Amount"
              value={amount}
              onChangeText={setAmount}
            />
            {/* Customer Information */}
            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter customer's name"
              value={customerName}
              onChangeText={setCustomerName}
            />
            <Text style={styles.label}>Customer Phone *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter customer's phone number"
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />
            <Text style={styles.label}>Customer Age</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter customer's age"
              keyboardType="numeric"
              value={customerAge}
              onChangeText={setCustomerAge}
            />
            <Text style={styles.label}>Customer Gender</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter customer's gender"
              value={customerGender}
              onChangeText={setCustomerGender}
            />
            <Text style={styles.label}>Customer Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter customer's location"
              value={customerLocation}
              onChangeText={setCustomerLocation}
            />

            <TouchableOpacity style={styles.button} onPress={saveTransaction}>
              <Text style={styles.buttonText}>{isEditing ? 'Update Transaction' : 'Save Transaction'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default TransactionForm;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    marginTop: 40,
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff',
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: '#fff',
  },
  input: {
    height: 40,
    borderColor: '#555',
    borderWidth: 1,
    marginBottom: 20,
    padding: 10,
    borderRadius: 5,
    color: '#fff',
    backgroundColor: '#333',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdown: {
    backgroundColor: '#333',
    borderColor: '#555',
    marginBottom: 20,
  },
  dropdownContainer: {
    backgroundColor: '#333',
    borderColor: '#555',
  },
});
