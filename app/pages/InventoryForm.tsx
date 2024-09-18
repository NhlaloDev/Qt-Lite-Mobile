import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator, // Import ActivityIndicator for the spinner
} from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '@/FirebaseConfig'; // Firebase imports
import { collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Colors from '@/constants/Colors';

interface InventoryItem {
  id: string;
  itemID: string;
  itemName: string;
  price: number;
  quantity?: number;
  quantityThreshold?: number;
}

const InventoryForm: React.FC = () => {
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [itemID, setItemID] = useState('');
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityThreshold, setQuantityThreshold] = useState('');
  const [userInventoryPath, setUserInventoryPath] = useState<string | null>(null); // Store the user's inventory path
  const [businessSector, setBusinessSector] = useState<string | null>(null); // Store business sector
  const [showForm, setShowForm] = useState(false); // Control form visibility
  const [editingItemId, setEditingItemId] = useState<string | null>(null); // Track the item being edited
  const [loading, setLoading] = useState(false); // Track loading state

  // Fetch the current user's ID, business sector, and their inventory data from Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      if (user) {
        const userId = user.uid;

        // Get user-specific Firestore path for inventory
        const userDocRef = doc(FIRESTORE_DB, 'system_users', userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setBusinessSector(userData.business_sector); // Set the business sector
          const inventoryPath = `system_users/${userId}/inventory`;
          setUserInventoryPath(inventoryPath);

          // Fetch the user's inventory in real-time
          const userInventoryRef = collection(FIRESTORE_DB, inventoryPath);
          const q = query(userInventoryRef);
          const unsubscribeInventory = onSnapshot(q, (snapshot) => {
            const inventoryData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setInventoryList(inventoryData as InventoryItem[]);
          });

          return () => unsubscribeInventory();
        }
      } else {
        setUserInventoryPath(null); // Reset if user logs out
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Function to generate the next itemID automatically
  const generateItemID = async (businessSector: string) => {
    if (!userInventoryPath) return;

    const itemType = businessSector === 'Products' ? 'P' : 'S'; // P for Products, S for Services
    const inventorySnapshot = await getDocs(collection(FIRESTORE_DB, userInventoryPath));

    let latestID = 0;

    // Loop through the documents to find the highest numeric part of the itemID
    inventorySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.itemID && data.itemID.startsWith(itemType)) {
        const numericPart = parseInt(data.itemID.substring(1), 10); // Extract numeric part (e.g., P0001 -> 0001)
        if (numericPart > latestID) {
          latestID = numericPart;
        }
      }
    });

    // Increment the latestID and format it back to P000X or S000X
    const newID = itemType + (latestID + 1).toString().padStart(4, '0');
    return newID;
  };

  // Save a new or edited item/service to Firestore
  const saveItem = async () => {
    if (!itemName || !price || (businessSector === 'Products' && (!quantity || !quantityThreshold))) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true); // Show the loader while processing

    try {
      let newItemID = itemID;
      if (!editingItemId) {
        // Generate the itemID automatically if we're adding a new item
        newItemID = await generateItemID(businessSector!);
      }

      const newItem: InventoryItem = {
        itemID: newItemID, // Use the generated or existing itemID
        itemName,
        price: parseFloat(price),
        ...(businessSector === 'Products' && {
          quantity: parseInt(quantity),
          quantityThreshold: parseInt(quantityThreshold),
        }),
      };

      if (editingItemId && userInventoryPath) {
        // Update existing item
        const itemDocRef = doc(FIRESTORE_DB, `${userInventoryPath}/${editingItemId}`);
        await updateDoc(itemDocRef, newItem);
        Alert.alert('Success', `${businessSector === 'Products' ? 'Item' : 'Service'} updated successfully!`);
      } else {
        // Add new item
        await addDoc(collection(FIRESTORE_DB, userInventoryPath!), newItem);
        Alert.alert('Success', `${businessSector === 'Products' ? 'Item' : 'Service'} added successfully!`);
      }

      clearForm();
      setShowForm(false); // Hide the form after saving the item
    } catch (error) {
      console.error('Error adding/updating item: ', error);
      Alert.alert('Error', `Failed to add/update ${businessSector === 'Products' ? 'item' : 'service'}.`);
    } finally {
      setLoading(false); // Stop the loader after the operation is complete
    }
  };

  // Auto-generate itemID on form display for new items
  useEffect(() => {
    const fetchAndSetItemID = async () => {
      if (!editingItemId && businessSector) {
        const newItemID = await generateItemID(businessSector);
        setItemID(newItemID);
      }
    };

    fetchAndSetItemID();
  }, [businessSector, editingItemId]); // Run when business sector or edit mode changes

  // Clear the form after saving or canceling
  const clearForm = () => {
    setItemID('');
    setItemName('');
    setPrice('');
    setQuantity('');
    setQuantityThreshold('');
    setEditingItemId(null); // Reset the editing state
  };

  // Populate the form with item data for editing
  const editItem = (item: InventoryItem) => {
    setItemID(item.itemID);
    setItemName(item.itemName);
    setPrice(item.price.toString());
    if (businessSector === 'Products') {
      setQuantity(item.quantity?.toString() || '');
      setQuantityThreshold(item.quantityThreshold?.toString() || '');
    }
    setEditingItemId(item.id); // Set the editing item ID
    setShowForm(true); // Show the form
  };

  // Delete an item from Firestore
  const deleteItem = async (itemId: string) => {
    try {
      if (userInventoryPath) {
        const itemDocRef = doc(FIRESTORE_DB, `${userInventoryPath}/${itemId}`);
        await deleteDoc(itemDocRef);
        Alert.alert('Success', `${businessSector === 'Products' ? 'Item' : 'Service'} deleted successfully!`);
      }
    } catch (error) {
      console.error('Error deleting item: ', error);
      Alert.alert('Error', `Failed to delete ${businessSector === 'Products' ? 'item' : 'service'}.`);
    }
  };

  // Render each item/service with edit and delete buttons
  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemText}>{businessSector === 'Products' ? 'Item' : 'Service'} ID: {item.itemID}</Text>
      <Text style={styles.itemText}>{businessSector === 'Products' ? 'Item' : 'Service'} Name: {item.itemName}</Text>
      <Text style={styles.itemText}>Price: R{item.price}</Text>
      {businessSector === 'Products' && (
        <>
          <Text style={styles.itemText}>Quantity: {item.quantity}</Text>
          <Text style={styles.itemText}>Threshold: {item.quantityThreshold}</Text>
        </>
      )}
      {/* Edit and Delete buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.editButton} onPress={() => editItem(item)}>
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => deleteItem(item.id)}>
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>{businessSector === 'Products' ? 'Inventory' : 'Services'}</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : showForm ? (
          <View style={styles.formContainer}>
            {/* Automatically generated itemID input (read-only) */}
            <Text style={styles.label}>{businessSector === 'Products' ? 'Item' : 'Service'} ID</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#555', color: '#fff' }]} // Visible text with read-only style
              value={itemID}
              editable={false} // Make the field non-editable
            />

            <Text style={styles.label}>{businessSector === 'Products' ? 'Item' : 'Service'} Name</Text>
            <TextInput
              style={styles.input}
              value={itemName}
              onChangeText={setItemName}
              placeholder={`Enter ${businessSector === 'Products' ? 'item' : 'service'} name`}
              placeholderTextColor="#AAA"
            />

            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Enter price"
              placeholderTextColor="#AAA"
              keyboardType="numeric"
            />

            {businessSector === 'Products' && (
              <>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Enter quantity"
                  placeholderTextColor="#AAA"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Quantity Threshold</Text>
                <TextInput
                  style={styles.input}
                  value={quantityThreshold}
                  onChangeText={setQuantityThreshold}
                  placeholder="Enter quantity threshold"
                  placeholderTextColor="#AAA"
                  keyboardType="numeric"
                />
              </>
            )}

            <TouchableOpacity style={styles.button} onPress={saveItem}>
              <Text style={styles.buttonText}>
                {editingItemId ? `Update ${businessSector === 'Products' ? 'Item' : 'Service'}` : `Save ${businessSector === 'Products' ? 'Item' : 'Service'}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#555' }]}
              onPress={() => {
                clearForm();
                setShowForm(false); // Hide the form when cancel is pressed
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Show Inventory/Service List */}
            <FlatList
              data={inventoryList}
              keyExtractor={(item) => item.id}
              renderItem={renderInventoryItem}
              ListEmptyComponent={<Text style={styles.emptyText}>No {businessSector === 'Products' ? 'items' : 'services'} found.</Text>}
            />

            {/* Button to show the add form */}
            <TouchableOpacity style={styles.button} onPress={() => setShowForm(true)}>
              <Text style={styles.buttonText}>{businessSector === 'Products' ? 'Add New Item' : 'Add New Service'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default InventoryForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    marginTop: 30,
    marginBottom: 20,
    color: '#fff',
    textAlign: 'center',
  },
  itemContainer: {
    backgroundColor: '#333',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
  },
  itemText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  formContainer: {
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
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
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  editButton: {
    backgroundColor: Colors.green,
    width: 150,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF4C4C',
    width: 150,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
});
