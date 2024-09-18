import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FIREBASE_APP, FIRESTORE_DB, FIREBASE_AUTH } from '@/FirebaseConfig'; // Firebase config
import { doc, setDoc } from 'firebase/firestore'; // For storing metadata in Firestore
import { AntDesign } from '@expo/vector-icons'; // For "X" icon

const MAX_FILES = 3;

const UploadDocuments = () => {
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const storage = getStorage(FIREBASE_APP);

  // Handle document picker
  const pickDocument = async () => {
    if (selectedFiles.length < MAX_FILES) {
      try {
        let result = await DocumentPicker.getDocumentAsync({ type: '*/*' });

        if (result && !result.canceled) {
          setSelectedFiles([...selectedFiles, result]);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to pick the document');
      }
    } else {
      Alert.alert('Max Limit', `You can only select up to ${MAX_FILES} documents.`);
    }
  };

  // Handle image picker
  const pickImage = async () => {
    if (selectedImages.length < MAX_FILES) {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImages([...selectedImages, result.uri]);
      }
    } else {
      Alert.alert('Max Limit', `You can only select up to ${MAX_FILES} images.`);
    }
  };

  // Upload documents and images to Firebase Storage and save metadata to Firestore
  const uploadFiles = async () => {
    try {
      setUploading(true);
      const currentUser = FIREBASE_AUTH.currentUser;

      if (!currentUser) {
        Alert.alert('Error', 'No user is logged in.');
        setUploading(false);
        return;
      }

      const userDocRef = doc(FIRESTORE_DB, `system_users/${currentUser.uid}/uploads`, 'metadata');

      // Handle document uploads
      for (const file of selectedFiles) {
        const docUri = file.uri;
        const docRef = ref(storage, `documents/${currentUser.uid}/${file.name}`);
        const response = await fetch(docUri);
        const blob = await response.blob();
        await uploadBytes(docRef, blob);
        const downloadUrl = await getDownloadURL(docRef);

        // Store document metadata in Firestore
        await setDoc(userDocRef, {
          documents: [
            {
              name: file.name,
              url: downloadUrl,
              uploadedAt: new Date(),
            },
          ],
        }, { merge: true });
      }

      // Handle image uploads
      for (const imageUri of selectedImages) {
        const imageRef = ref(storage, `images/${currentUser.uid}/${Date.now()}.jpg`);
        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        const downloadUrl = await getDownloadURL(imageRef);

        // Store image metadata in Firestore
        await setDoc(userDocRef, {
          images: [
            {
              url: downloadUrl,
              uploadedAt: new Date(),
            },
          ],
        }, { merge: true });
      }

      setUploading(false);
      Alert.alert('Success', 'Files uploaded successfully.');
    } catch (error) {
      setUploading(false);
      Alert.alert('Upload failed', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload Documents</Text>

      {/* Button to pick a document */}
      <TouchableOpacity style={styles.button} onPress={pickDocument} disabled={selectedFiles.length >= MAX_FILES}>
        <Text style={styles.buttonText}>Pick a Document</Text>
      </TouchableOpacity>

      {/* Show selected documents */}
      {selectedFiles.map((file, index) => (
        <View key={index} style={styles.fileInfo}>
          <Text style={styles.fileName}>Document Selected: {file.name}</Text>
          <TouchableOpacity onPress={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))} style={styles.removeButton}>
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Button to pick an image */}
      <TouchableOpacity style={styles.button} onPress={pickImage} disabled={selectedImages.length >= MAX_FILES}>
        <Text style={styles.buttonText}>Pick an Image</Text>
      </TouchableOpacity>

      {/* Show selected images */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {selectedImages.map((imageUri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <TouchableOpacity onPress={() => setSelectedImages(selectedImages.filter((_, i) => i !== index))} style={styles.closeIcon}>
                <AntDesign name="closecircle" size={24} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Upload Button */}
      <TouchableOpacity style={styles.uploadButton} onPress={uploadFiles} disabled={uploading}>
        <Text style={styles.buttonText}>{uploading ? 'Uploading...' : 'Upload Files'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default UploadDocuments;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    marginTop: 40,
    color: '#fff',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    alignItems: 'center',
    borderRadius: 5,
    marginBottom: 20,
    width: '100%',
  },
  uploadButton: {
    backgroundColor: '#28a745',
    padding: 15,
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 20,
    marginBottom: 35,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fileInfo: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileName: {
    color: '#fff',
    fontSize: 16,
  },
  removeButton: {
    backgroundColor: 'red',
    padding: 5,
    borderRadius: 5,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  imageContainer: {
    flexDirection: 'row',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  closeIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
});
