import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '@/FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { ActivityIndicator } from 'react-native';

const ViewDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      const currentUser = FIREBASE_AUTH.currentUser;

      if (!currentUser) {
        console.error('No user logged in.');
        setLoading(false);
        return;
      }

      const userDocRef = doc(FIRESTORE_DB, `system_users/${currentUser.uid}/uploads`, 'metadata');
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setDocuments(data.documents || []);
        setImages(data.images || []);
      } else {
        console.log('No documents found.');
      }

      setLoading(false);
    };

    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Uploaded Documents</Text>

      {/* Display Uploaded Documents */}
      {documents.length > 0 ? (
        documents.map((doc, index) => (
          <TouchableOpacity key={index} onPress={() => Linking.openURL(doc.url)}>
            <Text style={styles.documentName}>{doc.name}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.noDocuments}>No documents uploaded yet.</Text>
      )}

      <Text style={styles.title}>Uploaded Images</Text>

      {/* Display Uploaded Images */}
      {images.length > 0 ? (
        images.map((image, index) => (
          <TouchableOpacity key={index} onPress={() => Linking.openURL(image.url)}>
            <Text style={styles.imageName}>Image {index + 1}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.noDocuments}>No images uploaded yet.</Text>
      )}
    </ScrollView>
  );
};

export default ViewDocuments;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#000',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    marginTop: 40,
    color: '#fff',
  },
  documentName: {
    color: '#007bff',
    fontSize: 18,
    marginBottom: 10,
    textDecorationLine: 'underline',
  },
  imageName: {
    color: '#28a745',
    fontSize: 18,
    marginBottom: 10,
    textDecorationLine: 'underline',
  },
  noDocuments: {
    color: '#aaa',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
