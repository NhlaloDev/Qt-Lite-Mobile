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
  ScrollView,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { FIREBASE_AUTH, FIRESTORE_DB } from '@/FirebaseConfig';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Colors from '@/constants/Colors';

interface Task {
  id: string;
  taskID: string;
  name: string;
  due: string;
  budget: number;
  spent: number;
  target: number;
  targetType: string;
  status: number;
}

const TaskForm: React.FC = () => {
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [taskID, setTaskID] = useState('');
  const [taskName, setTaskName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [budget, setBudget] = useState('');
  const [spent, setSpent] = useState('');
  const [target, setTarget] = useState('');
  const [targetType, setTargetType] = useState(''); // New state for target type
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userTasksPath, setUserTasksPath] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [openTargetType, setOpenTargetType] = useState(false);

  // Options for target type
  const targetTypeOptions = [
    { label: 'Percentage', value: 'Percentage' },
    { label: 'Number', value: 'Number' },
  ];

  // Fetch the current user's ID and tasks data from Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      if (user) {
        setUserId(user.uid);

        const userTasksRef = collection(FIRESTORE_DB, `system_users/${user.uid}/tasks`);
        setUserTasksPath(`system_users/${user.uid}/tasks`);

        const q = query(userTasksRef);
        const unsubscribeTasks = onSnapshot(q, (snapshot) => {
          const tasksData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTaskList(tasksData as Task[]);
        });

        return () => unsubscribeTasks();
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Function to generate the next task ID in the format T0001, T0002...
  const generateNextTaskID = () => {
    if (taskList.length > 0) {
      const lastTaskID = taskList
        .map((task) => task.taskID)
        .sort() // Sort the task IDs
        .pop(); // Get the last task ID

      if (lastTaskID) {
        const lastNumber = parseInt(lastTaskID.slice(1)); // Extract the number part and increment
        const newTaskID = `T${String(lastNumber + 1).padStart(4, '0')}`; // Pad with zeros (e.g., T0002)
        setTaskID(newTaskID);
      } else {
        setTaskID('T0001'); // If no tasks exist yet, start with T0001
      }
    } else {
      setTaskID('T0001'); // If no tasks exist, start with T0001
    }
  };

  // Automatically set task ID when form opens for new task creation
  useEffect(() => {
    if (!editingTaskId) {
      generateNextTaskID(); // Only generate new ID if not editing
    }
  }, [showForm, taskList, editingTaskId]);

  // Save a new or edited task to Firestore
  const saveTask = async () => {
    if (!taskID || !taskName || !dueDate || !budget || !spent || !target || !status || !targetType) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      const newTask: Task = {
        taskID,
        name: taskName,
        due: dueDate,
        budget: parseFloat(budget),
        spent: parseFloat(spent),
        target: parseFloat(target),
        targetType,
        status: parseFloat(status),
      };

      if (editingTaskId && userTasksPath) {
        const taskDocRef = doc(FIRESTORE_DB, `${userTasksPath}/${editingTaskId}`);
        await updateDoc(taskDocRef, newTask);
        Alert.alert('Success', 'Task updated successfully!');
      } else {
        // Check if taskID already exists
        const taskExists = taskList.some((task) => task.taskID === taskID);
        if (taskExists) {
          Alert.alert('Error', `Task ID ${taskID} already exists. Try again.`);
          return;
        }

        // Add new task with generated task ID
        await addDoc(collection(FIRESTORE_DB, userTasksPath!), newTask);
        Alert.alert('Success', 'Task added successfully!');
      }

      clearForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error adding/updating task: ', error);
      Alert.alert('Error', 'Failed to add/update task.');
    }
  };

  const editTask = (task: Task) => {
    setTaskID(task.taskID);
    setTaskName(task.name);
    setDueDate(task.due);
    setBudget(task.budget.toString());
    setSpent(task.spent.toString());
    setTarget(task.target.toString());
    setTargetType(task.targetType);
    setStatus(task.status.toString());
    setEditingTaskId(task.id);
    setShowForm(true);
  };

  const clearForm = () => {
    setTaskID('');
    setTaskName('');
    setDueDate('');
    setBudget('');
    setSpent('');
    setTarget('');
    setTargetType('');
    setStatus('');
    setEditingTaskId(null);
  };

  const deleteTask = async (taskId: string) => {
    try {
      if (userTasksPath) {
        const taskDocRef = doc(FIRESTORE_DB, `${userTasksPath}/${taskId}`);
        await deleteDoc(taskDocRef);
        Alert.alert('Success', 'Task deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting task: ', error);
      Alert.alert('Error', 'Failed to delete task.');
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemText}>Task ID: {item.taskID}</Text>
      <Text style={styles.itemText}>Task Name: {item.name}</Text>
      <Text style={styles.itemText}>Due: {item.due}</Text>
      <Text style={styles.itemText}>Budget: {item.budget}</Text>
      <Text style={styles.itemText}>Spent: {item.spent}</Text>
      <Text style={styles.itemText}>Target Type: {item.targetType}</Text>
      <Text style={styles.itemText}>Target: {item.target}</Text>
      <Text style={styles.itemText}>Status: {item.status}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.editButton} onPress={() => editTask(item)}>
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTask(item.id)}>
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Task Management</Text>

        {showForm ? (
          <ScrollView>
            <View style={styles.formContainer}>
              <Text style={styles.label}>Task ID</Text>
              <TextInput
                style={styles.input}
                value={taskID}
                onChangeText={setTaskID}
                placeholder="Enter Task ID"
                placeholderTextColor="#AAA"
                editable={false} // Disable editing of task ID
              />

              <Text style={styles.label}>Task Name</Text>
              <TextInput
                style={styles.input}
                value={taskName}
                onChangeText={setTaskName}
                placeholder="Enter Task Name"
                placeholderTextColor="#AAA"
              />

              <Text style={styles.label}>Due Date</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="Enter Due Date"
                placeholderTextColor="#AAA"
              />

              <Text style={styles.label}>Budget</Text>
              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={setBudget}
                placeholder="Enter Budget"
                placeholderTextColor="#AAA"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Spent</Text>
              <TextInput
                style={styles.input}
                value={spent}
                onChangeText={setSpent}
                placeholder="Enter Amount Spent"
                placeholderTextColor="#AAA"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Target Type</Text>
              <DropDownPicker
                open={openTargetType}
                value={targetType}
                items={targetTypeOptions}
                setOpen={setOpenTargetType}
                setValue={setTargetType}
                placeholder="Select Target Type"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
              />

              <Text style={styles.label}>Target</Text>
              <TextInput
                style={styles.input}
                value={target}
                onChangeText={setTarget}
                placeholder="Enter Target"
                placeholderTextColor="#AAA"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Status</Text>
              <TextInput
                style={styles.input}
                value={status}
                onChangeText={setStatus}
                placeholder="Enter Status"
                placeholderTextColor="#AAA"
                keyboardType="numeric"
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={saveTask}>
                  <Text style={styles.buttonText}>{editingTaskId ? 'Update Task' : 'Save Task'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#555' }]}
                  onPress={() => {
                    clearForm();
                    setShowForm(false);
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        ) : (
          <>
            <FlatList
              data={taskList}
              keyExtractor={(item) => item.id}
              renderItem={renderTaskItem}
              ListEmptyComponent={<Text style={styles.emptyText}>No tasks found.</Text>}
            />

            <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
              <Text style={styles.buttonText}>Add New Task</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default TaskForm;

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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    alignItems: 'center',
    borderRadius: 5,
    width: '48%',
  },
  addButton: {
    backgroundColor: '#007bff',
    padding: 15,
    alignItems: 'center',
    borderRadius: 5,
    width: '100%',
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
