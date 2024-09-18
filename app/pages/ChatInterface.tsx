import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  Alert,
  Image,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { FIREBASE_AUTH, FIRESTORE_DB, FIREBASE_APP} from '@/FirebaseConfig'; // Firebase imports
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import axios from 'axios'; // Axios for REST API

interface Message {
  id: string;
  sender: 'user' | 'bot';
  type: 'text' | 'image' | 'document';
  text?: string;
  uri?: string;
}

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState<string | null>(null); // To store Firebase user ID
  const [userName, setUserName] = useState<string>(''); // To store the user's name
  const flatListRef = useRef<FlatList>(null);

  // Fetch the current user's ID from Firebase Auth and their name from Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      if (user) {
        setUserId(user.uid); // Set the current user's ID

        // Fetch user's name from Firestore
        const userDocRef = doc(FIRESTORE_DB, 'system_users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || ''); // Set the user's name
        }
      } else {
        setUserId(null); // User is not logged in
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Send message to server and get response
  const sendMessageToServer = async (message: string) => {
    try {
      const response = await axios.post('https://rairo-quant-lite.hf.space/predict', {
        user_id: userId, // Send user_id from Firebase
        user_question: message,
      });

      // Add the bot's response to the chat
      const botMessage: Message = {
        id: Date.now().toString(),
        sender: 'bot',
        type: 'text',
        text: response.data || "Sorry, I couldn't understand that.",
      };
      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error connecting to server:', error);
      Alert.alert('Error', 'Unable to connect to the server.');
    }
  };

  const sendMessage = () => {
    if (inputText.trim() === '') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      type: 'text',
      text: inputText,
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    sendMessageToServer(inputText); // Send user message to server for AI response
    setInputText('');
  };

  const handleAddButtonPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Choose Photo', 'Choose Document'],
          cancelButtonIndex: 0,
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            pickImage();
          } else if (buttonIndex === 2) {
            pickDocument();
          }
        }
      );
    } else {
      Alert.alert(
        'Select Option',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Choose Photo', onPress: pickImage },
          { text: 'Choose Document', onPress: pickDocument },
        ],
        { cancelable: true }
      );
    }
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageAsset = result.assets[0];
        const imageUri = imageAsset.uri;

        // Upload the image to Firebase Storage
        const storage = getStorage(FIREBASE_APP);
        const imageRef = ref(storage, `images/${Date.now()}.jpg`);

        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        const downloadUrl = await getDownloadURL(imageRef);

        // Add the image message to the chat
        const imageMessage: Message = {
          id: Date.now().toString(),
          sender: 'user',
          type: 'image',
          uri: downloadUrl,
        };

        setMessages(prevMessages => [...prevMessages, imageMessage]);
      } else {
        console.log('Image selection was canceled');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick the image');
    }
  };

  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
      });

      if (result.type === 'success') {
        const docUri = result.uri;
        const docName = result.name;

        // Upload the document to Firebase Storage
        const storage = getStorage(FIREBASE_APP);
        const docRef = ref(storage, `documents/${docName}`);

        const response = await fetch(docUri);
        const blob = await response.blob();
        await uploadBytes(docRef, blob);
        const downloadUrl = await getDownloadURL(docRef);

        // Add the document message to the chat
        const docMessage: Message = {
          id: Date.now().toString(),
          sender: 'user',
          type: 'document',
          uri: downloadUrl,
          text: docName,
        };

        setMessages(prevMessages => [...prevMessages, docMessage]);
      } else {
        console.log('Document selection was canceled');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick the document');
    }
  };

  const openDocument = async (uri: string | undefined) => {
    if (!uri) return;
    try {
      await Linking.openURL(uri);
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Failed to open the document');
    }
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const renderItem = ({ item }: { item: Message }) => {
    let content;
    if (item.type === 'text') {
      content = <Text style={styles.messageText}>{item.text}</Text>;
    } else if (item.type === 'image') {
      content = <Image source={{ uri: item.uri }} style={styles.messageImage} />;
    } else if (item.type === 'document') {
      content = (
        <TouchableOpacity onPress={() => openDocument(item.uri)}>
          <Text style={styles.messageText}>{item.text}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View
        style={[
          styles.messageContainer,
          item.sender === 'user' ? styles.userMessage : styles.botMessage,
        ]}
      >
        {content}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 60, android: 0 })}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={handleAddButtonPress} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Hello, ${userName}`} // Dynamically set placeholder text
            placeholderTextColor="#AAA"
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
        </View>
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    margin: 5,
  },
  messagesContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#1E90FF',
    alignSelf: 'flex-end',
  },
  botMessage: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: '#FFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderColor: '#444',
    backgroundColor: '#000',
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 24,
    color: '#1E90FF',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  sendButtonText: {
    fontSize: 16,
    color: '#1E90FF',
  },
});
