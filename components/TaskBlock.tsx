import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons'; // Importing Material Icons correctly
import Colors from '@/constants/Colors';
import { TaskIcon } from '@/constants/Icons';
import { FIRESTORE_DB, FIREBASE_AUTH } from '@/FirebaseConfig';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Define the type for task items
type TaskType = {
  taskID: string;
  name: string;
  due: string;
  budget?: number;
  spent?: number;
  target?: number;
  status?: number;
};

const TaskBlock = () => {
  const router = useRouter(); // Use the router for navigation
  const [taskList, setTaskList] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user tasks from Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      if (user) {
        const userId = user.uid;

        // Query Firestore to get tasks specific to the logged-in user
        const tasksCollectionRef = collection(FIRESTORE_DB, `system_users/${userId}/tasks`);
        const tasksQuery = query(tasksCollectionRef);

        const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
          const tasksData = snapshot.docs
            .map((doc) => ({
              taskID: doc.id, // Using taskID instead of itemID
              ...doc.data(),
            }))
            .filter((item) => !!item) as TaskType[]; // Ensure we only map over valid items

          setTaskList(tasksData); // Update the taskList state with fetched tasks
          setLoading(false); // Turn off the loading indicator once data is fetched
        });

        return () => unsubscribeTasks(); // Cleanup the snapshot listener on unmount
      } else {
        // Handle the case where the user is not authenticated
        router.push('/pages/LoginForm');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleAddTask = () => {
    // Navigate to the Tasks page to add a new task
    router.push('/pages/Tasks');
  };

  const handleEditTask = (taskID) => {
    // Pass the task details to the edit screen
    router.push({
      pathname: '/pages/Tasks',
      params: { taskID }, // Pass task ID as parameter
    });
  };

  const handleDeleteTask = async (taskID: string) => {
    // Delete the task from Firestore
    try {
      const taskDocRef = doc(FIRESTORE_DB, `system_users/${FIREBASE_AUTH.currentUser?.uid}/tasks`, taskID);
      await deleteDoc(taskDocRef);
      console.log(`Task with ID ${taskID} deleted`);
    } catch (error) {
      console.error(`Failed to delete task with ID ${taskID}`, error);
    }
  };

  const getStatusColor = (status: number, target: number) => {
    if (!status || !target) return Colors.grey; // Default color when data is missing

    const percentage = (status / target) * 100;

    if (percentage < 50) return 'red'; // Less than 50%
    if (percentage >= 50 && percentage < 75) return 'orange'; // Between 50% and 75%
    return 'green'; // 75% or above
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  return (
    <View style={styles.taskSectionWrapper}>
      <View style={styles.headerWrapper}>
        <Text style={styles.sectionTitle}>
          Planned <Text style={{ fontWeight: '700' }}>Tasks</Text>
        </Text>

        {/* Add Task Button */}
        <TouchableOpacity style={styles.button} onPress={handleAddTask}>
          <Text style={styles.buttonText}>+ Add Tasks</Text>
        </TouchableOpacity>
      </View>

      {taskList.length > 0 ? (
        taskList.map((item) => {
          // Ensure item is not undefined or null and has required fields
          if (!item || !item.taskID || !item.name) return null;

          const statusColor = getStatusColor(item.status, item.target);

          return (
            <View style={styles.taskContainer} key={item.taskID}>
              {/* Icon */}
              <View style={styles.iconWrapper}>
                <TaskIcon width={30} height={30} color={Colors.white} />
              </View>

              {/* Task Details */}
              <View style={styles.taskDetailsWrapper}>
                <Text style={styles.itemName}>{item.name || 'No Name'}</Text>
                <Text style={styles.dueText}>{item.due || 'No Due Date'}</Text>
                <Text style={styles.detailText}>Budget: R {item.budget ? item.budget.toFixed(2) : '0.00'}</Text>
                <Text style={styles.detailText}>Spent: R {item.spent ? item.spent.toFixed(2) : '0.00'}</Text>
                <Text style={styles.detailText}>Target: {item.target ? item.target.toFixed(2) : '0.00'} %</Text>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  Status: {item.status ? item.status.toFixed(2) : '0.00'} %
                </Text>
              </View>

              {/* Edit and Delete Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.editButton} onPress={() => handleEditTask(item.taskID)}>
                  <MaterialIcons name="edit" size={24} color={Colors.white} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteTask(item.taskID)}>
                  <MaterialIcons name="delete" size={24} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.noTasksWrapper}>
          <Text style={styles.noTasksText}>Start planning by adding a new task!</Text>
        </View>
      )}
    </View>
  );
};

export default TaskBlock;

const styles = StyleSheet.create({
  taskSectionWrapper: {
    marginVertical: 20,
    alignItems: 'flex-start',
  },
  headerWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: 18,
  },
  noTasksWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTasksText: {
    color: Colors.white,
    marginLeft: 50,
  },
  button: {
    backgroundColor: Colors.tintColor,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  taskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey,
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
  },
  iconWrapper: {
    backgroundColor: Colors.black,
    padding: 15,
    borderRadius: 50,
    marginRight: 15,
  },
  taskDetailsWrapper: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  itemName: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  dueText: {
    color: Colors.red,
    fontWeight: '700',
    marginBottom: 5,
  },
  detailText: {
    color: Colors.white,
    fontSize: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.blue,
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  deleteButton: {
    backgroundColor: Colors.red,
    padding: 10,
    borderRadius: 5,
  },
});
