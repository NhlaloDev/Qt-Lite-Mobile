import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
  } from "react-native";
  import React, { useEffect, useState } from "react";
  import Colors from "@/constants/Colors";
  import { Stack, useRouter } from "expo-router";
  import Header from "@/components/Header";
  import { PieChart } from "react-native-gifted-charts";
  import TaskDashBlock from "@/components/TaskDashBlock";
  import IncomeBlock from "@/components/IncomeBlock";
  import TaskBlock from "@/components/TaskBlock";
  import { FIRESTORE_DB, FIREBASE_AUTH } from "@/FirebaseConfig"; // Firebase Firestore and Auth import
  import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";
  import * as Notifications from "expo-notifications";
  import axios from "axios";

  const Page = () => {
    const [taskList, setTaskList] = useState([]);
    const [user, setUser] = useState(null); // State for storing user data
    const [loading, setLoading] = useState(true); // Loading state while checking auth
    const [error, setError] = useState(null); // State to track any errors
    const router = useRouter();

    // Fetch logged-in user's information from Firestore
    useEffect(() => {
      const unsubscribeAuth = onAuthStateChanged(FIREBASE_AUTH, async (authUser) => {
        if (authUser) {
          try {
            const userDocRef = doc(FIRESTORE_DB, "system_users", authUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              setUser(userDoc.data());

              // Real-time fetch of tasks from the 'tasks' sub-collection for the specific user
              const tasksCollection = collection(
                FIRESTORE_DB,
                `system_users/${authUser.uid}/tasks`
              );

              const unsubscribeTasks = onSnapshot(tasksCollection, (snapshot) => {
                const tasksData = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                setTaskList(tasksData);
                setLoading(false); // Stop loading once tasks are fetched
              });

              // Check inventory stock below threshold
              checkInventoryThreshold(authUser.uid);

              // Set notification interval every 4 hours
              const notificationInterval = setInterval(() => {
                fetchMarketingRecommendations(authUser.uid);
              }, 4 * 60 * 60 * 1000); // 4 hours in milliseconds

              return () => {
                unsubscribeTasks();
                clearInterval(notificationInterval); // Clean up interval on unmount
              };
            } else {
              console.error("User document not found in Firestore");
              setError("User document not found in Firestore");
              setLoading(false);
            }
          } catch (err) {
            setError("Error fetching user data or tasks.");
            setLoading(false);
          }
        } else {
          router.replace("/pages/LoginForm");
        }
      });
      return () => unsubscribeAuth();
    }, []);

    // Check inventory threshold
    const checkInventoryThreshold = async (userId) => {
      const inventoryCollection = collection(FIRESTORE_DB, `system_users/${userId}/inventory`);
      onSnapshot(inventoryCollection, (snapshot) => {
        const lowStockItems = snapshot.docs.filter(
          (doc) => doc.data().quantity <= doc.data().quantityThreshold
        );
        if (lowStockItems.length > 0) {
          Alert.alert(
            "Low Stock Alert",
            "Some items in your inventory have low stock. Please check."
          );
        }
      });
    };

    // Fetch marketing recommendations
    const fetchMarketingRecommendations = async (userId) => {
      try {
        const response = await axios.post("https://api.example.com/mrec", {
          user_id: userId,
        });

        const recommendationMessage = response.data?.recommendation || "No recommendations available.";

        // Trigger a local notification with the recommendation
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Marketing Recommendation",
            body: recommendationMessage,
          },
          trigger: null, // Immediate notification
        });
      } catch (error) {
        console.error("Failed to fetch marketing recommendations", error);
      }
    };

    if (loading) {
      return (
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center", marginTop: 10 },
          ]}
        >
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      );
    }

    if (error) {
      return (
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ color: Colors.red }}>{error}</Text>
        </View>
      );
    }

    // Categorize tasks
    const now = new Date();
    const completedTasks = taskList.filter((task) => task.status === task.target);
    const upcomingTasks = taskList.filter(
      (task) => new Date(task.due) > now && task.status !== task.target
    );
    const overdueTasks = taskList.filter(
      (task) => new Date(task.due) < now && task.status !== task.target
    );
    const plannedTasks = taskList.filter((task) => task.status !== task.target);

    const totalTasks = taskList.length;
    const completedPercentage = (completedTasks.length / totalTasks) * 100 || 0;
    const upcomingPercentage = (upcomingTasks.length / totalTasks) * 100 || 0;
    const overduePercentage = (overdueTasks.length / totalTasks) * 100 || 0;
    const plannedPercentage = (plannedTasks.length / totalTasks) * 100 || 0;

    // Pie chart data
    const pieData = [
      {
        value: completedPercentage,
        color: Colors.white,
        text: `${completedPercentage.toFixed(2)}%`,
      },
      {
        value: upcomingPercentage,
        color: Colors.tintColor,
        text: `${upcomingPercentage.toFixed(2)}%`,
      },
      {
        value: overduePercentage,
        color: "#FFA5BA",
        gradientCenterColor: "#FF7F97",
        text: `${overduePercentage.toFixed(2)}%`,
      },
      {
        value: plannedPercentage,
        color: Colors.blue,
        text: `${plannedPercentage.toFixed(2)}%`,
      },
    ];

    return (
      <>
        <Stack.Screen options={{ header: () => <Header userName={user?.name} /> }} />
        <View style={[styles.container, { paddingTop: 40 }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ gap: 10 }}>
                <Text style={{ color: Colors.white, fontSize: 16 }}>
                  Planner <Text style={{ fontWeight: 700 }}>Dashboard</Text>
                </Text>
                <Text style={{ color: Colors.white, fontSize: 36, fontWeight: 700 }}>
                  {totalTasks}
                </Text>
              </View>
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <PieChart
                  data={pieData}
                  donut
                  showGradient
                  sectionAutoFocus
                  semiCircle
                  radius={70}
                  innerRadius={55}
                  innerCircleColor={Colors.black}
                  centerLabelComponent={() => (
                    <View style={{ justifyContent: "center", alignItems: "center" }}>
                      <Text style={{ fontSize: 22, color: "white", fontWeight: "bold" }}>
                        {completedPercentage.toFixed(0)}%
                      </Text>
                    </View>
                  )}
                />
              </View>
            </View>

            <TaskDashBlock expenseList={[]} />
            <IncomeBlock incomeList={[]} />
            <TaskBlock taskList={taskList} />
          </ScrollView>
        </View>
      </>
    );
  };

  export default Page;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.black,
      paddingHorizontal: 20,
    },
  });
