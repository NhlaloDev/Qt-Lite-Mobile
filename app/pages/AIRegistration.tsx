import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import Colors from "@/constants/Colors";
import { Stack } from "expo-router";
import { FIRESTORE_DB, FIREBASE_AUTH } from "@/FirebaseConfig"; // Firebase Firestore and Auth import
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Purchases from "react-native-purchases"; // RevenueCat import
import { AntDesign, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import Header from "@/components/Header";  // Import your custom header component

const Page = () => {
  const [user, setUser] = useState(null); // State for storing user data
  const router = useRouter(); // Initialize the router
  const [isSubscribed, setIsSubscribed] = useState(false); // Track subscription status

  // Fetch logged-in user's information from Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(FIREBASE_AUTH, async (authUser) => {
      if (authUser) {
        // Fetch the user's details from Firestore
        const userDocRef = doc(FIRESTORE_DB, 'system_users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser(userDoc.data());
        }
        // Check for subscription status with RevenueCat
        await checkSubscription();
      } else {
        // If no user is logged in, redirect to LoginForm
        router.replace("/pages/LoginForm");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Function to check subscription using RevenueCat
  const checkSubscription = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo(); // Get customer info from RevenueCat
      if (
        customerInfo.entitlements.active &&
        customerInfo.entitlements.active["AI_Analytics"]
      ) {
        // If the user has the AI Analytics entitlement active, set subscribed to true
        setIsSubscribed(true);
      } else {
        // If not, they are not subscribed
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error("Error checking subscription: ", error);
      setIsSubscribed(false); // If there's an error, treat it as not subscribed
    }
  };

  // Navigate based on subscription status
  const handleAiAnalyticsPress = () => {
    if (isSubscribed) {
      // If subscribed, navigate to the AI Analytics screen (replace with your analytics screen)
      router.push("/pages/ChatInterface");
    } else {
      // If not subscribed, navigate to the registration page
      router.push("/pages/AIRegistration");
    }
  };

  const navigateToUploadDocuments = () => {
    router.push("/pages/UploadDocuments"); // Navigate to the new TransPlot screen
  };

  const navigateToInventory = () => {
    router.push("/pages/InventoryForm"); // Navigate to the new TransPlot screen
  };

  const navigateToProfile = () => {
    router.push("/pages/MyProfile"); // Navigate to the new TransPlot screen
  };

  const navigateToDocuments = () => {
    router.push("/pages/ViewDocuments"); // Navigate to the new TransPlot screen
  };

  const navigateToBizzyHelper = () => {
    router.push("/pages/ChatInterface"); // Navigate to the new TransPlot screen
  };

  return (
    <>
      <Stack.Screen options={{ header: () => <Header userName={user?.name} /> }} />
      <View style={styles.container}>

        {/* Sidebar */}
        <View style={styles.sidebar}>

          {/* AI Analytics with Subscription Check */}
          <TouchableOpacity style={styles.menuItem} onPress={handleAiAnalyticsPress}>
            <Ionicons name="logo-android" size={20} color="white" />
            <Text style={styles.menuText}>AI Analytics</Text>
          </TouchableOpacity>

          {/* Configure Section */}
          <Text style={styles.sectionHeader}>CONFIGURE</Text>

          <TouchableOpacity style={styles.menuItem}>
            <FontAwesome5 name="users" size={20} color="white" />
            <Text style={styles.menuText}>Team Members</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={navigateToInventory}>
            <Ionicons name="cube-outline" size={20} color="white" />
            <Text style={styles.menuText}>Inventory</Text>
          </TouchableOpacity>

          {/* Toolbox Section */}
          <Text style={styles.sectionHeader}>TOOLBOX</Text>

          <TouchableOpacity style={styles.menuItem} onPress={navigateToUploadDocuments}>
            <Ionicons name="cloud-upload-outline" size={20} color="white" />
            <Text style={styles.menuText}>Documents Upload</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={navigateToDocuments}>
            <Ionicons name="document-text-outline" size={20} color="white" />
            <Text style={styles.menuText}>View Documents</Text>
          </TouchableOpacity>

          {/* Account Section */}
          <Text style={styles.sectionHeader}>MY ACCOUNT</Text>

          <TouchableOpacity style={styles.menuItem} onPress={navigateToProfile}>
            <Ionicons name="person-circle-outline" size={20} color="white" />
            <Text style={styles.menuText}>View Details</Text>
          </TouchableOpacity>

        </View>
      </View>
    </>
  );
};

export default Page;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: Colors.black,
    paddingTop: 40,
  },
  sidebar: {
    padding: 15,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  menuText: {
    color: "white",
    fontSize: 16,
    marginLeft: 10,
  },
  sectionHeader: {
    color: "#AAA",
    fontSize: 14,
    marginVertical: 10,
    fontWeight: "bold",
    alignSelf: "center",
  },
});
