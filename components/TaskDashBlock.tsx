import {
    FlatList,
    ListRenderItem,
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
  } from "react-native";
  import React, { useEffect, useState } from "react";
  import Colors from "@/constants/Colors";
  import { FIREBASE_AUTH, FIRESTORE_DB } from "@/FirebaseConfig"; // Firebase imports
  import { collection, query, onSnapshot } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";

  interface TaskType {
    id: string;
    name: string;
    due: string;
    budget: number;
    spent: number;
    target: number;
    status: number;
  }

  const TaskBlock = () => {
    const [taskList, setTaskList] = useState<TaskType[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null); // To store the logged-in user ID

    useEffect(() => {
      // Authenticate and fetch user-specific tasks
      const unsubscribeAuth = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
        if (user) {
          setUserId(user.uid); // Get the logged-in user's ID
          fetchTasksForUser(user.uid);
        } else {
          setUserId(null); // Reset if no user is logged in
        }
      });

      return () => unsubscribeAuth();
    }, []);

    const fetchTasksForUser = async (userId: string) => {
      try {
        const tasksQuery = query(
          collection(FIRESTORE_DB, `system_users/${userId}/tasks`)
        );

        const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
          const tasksData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as TaskType[];
          setTaskList(tasksData);
          setLoading(false); // Stop loading when data is fetched
        });

        return () => unsubscribeTasks(); // Cleanup the snapshot listener
      } catch (error) {
        console.error("Error fetching tasks: ", error);
        setLoading(false);
      }
    };

    const now = new Date();

    // Filter tasks into categories and count them
    const completedCount = taskList.filter(
      (task) => task.status === task.target
    ).length;
    const upcomingCount = taskList.filter(
      (task) => new Date(task.due) > now && task.status !== task.target
    ).length;
    const overdueCount = taskList.filter(
      (task) => new Date(task.due) < now && task.status !== task.target
    ).length;
    const plannedCount = taskList.filter(
      (task) => task.status !== task.target
    ).length;

    const categorizedTasks = [
      { name: "Planned Tasks", count: plannedCount },
      { name: "Completed", count: completedCount },
      { name: "Upcoming", count: upcomingCount },
      { name: "Overdue", count: overdueCount },
    ];

    const renderItem: ListRenderItem<{ name: string; count: number }> = ({
      item,
    }) => {
      let backgroundColor;
      let textColor;

      switch (item.name) {
        case "Planned Tasks":
          backgroundColor = Colors.blue;
          textColor = Colors.black;
          break;
        case "Completed":
          backgroundColor = Colors.white;
          textColor = Colors.black;
          break;
        case "Upcoming":
          backgroundColor = Colors.tintColor;
          textColor = Colors.black;
          break;
        case "Overdue":
          backgroundColor = "#FFA5BA";
          textColor = Colors.white;
          break;
        default:
          backgroundColor = Colors.tintColor;
          textColor = Colors.white;
          break;
      }

      return (
        <View style={[styles.taskBlock, { backgroundColor }]}>
          <Text style={[styles.taskBlockTxt1, { color: textColor }]}>
            {item.name}
          </Text>
          <Text style={[styles.taskBlockTxt2, { color: textColor }]}>
            {item.count}
          </Text>
        </View>
      );
    };

    if (loading) {
      return (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      );
    }

    return (
      <View style={{ paddingVertical: 20 }}>
        <FlatList
          data={categorizedTasks}
          renderItem={renderItem}
          keyExtractor={(item) => item.name}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>
    );
  };

  export default TaskBlock;

  const styles = StyleSheet.create({
    taskBlock: {
      backgroundColor: Colors.tintColor,
      width: 150,
      padding: 15,
      borderRadius: 15,
      marginRight: 20,
      gap: 8,
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    taskBlockTxt1: {
      color: Colors.white,
      fontSize: 14,
    },
    taskBlockTxt2: {
      color: Colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });
