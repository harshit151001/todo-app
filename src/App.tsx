import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";

interface Todo {
  id: number;
  text: string;
  status: "Pending" | "Completed";
}

interface ElectronAPI {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, data: string) => Promise<void>;
  showNotification: (title: string, body: string) => void;
  saveOfflineData: (data: any) => Promise<void>;
  getOfflineData: () => Promise<any>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState<"All" | "Pending" | "Completed">("All");

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getOfflineData();
        if (data && data.todos) {
          setTodos(data.todos);
        }
      } catch (error) {
        console.error("Failed to load todos:", error);
      }
    } else {
      const storedTodos = localStorage.getItem("todos");
      if (storedTodos) {
        setTodos(JSON.parse(storedTodos));
      }
    }
  };

  const saveTodos = async (updatedTodos: Todo[]) => {
    if (window.electronAPI) {
      await window.electronAPI.saveOfflineData({ todos: updatedTodos });
    } else {
      localStorage.setItem("todos", JSON.stringify(updatedTodos));
    }
  };

  const addTodo = () => {
    if (newTodo.trim()) {
      const updatedTodos: Todo[] = [
        ...todos,
        {
          id: Date.now(),
          text: newTodo.trim(),
          status: "Pending" as "Pending" | "Completed",
        },
      ];
      setTodos(updatedTodos);
      saveTodos(updatedTodos);
      setNewTodo("");
      showNotification("Todo Added", "A new todo has been added.");
    }
  };

  const deleteTodo = (id: number) => {
    const updatedTodos = todos.filter((todo) => todo.id !== id);
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
    showNotification("Todo Deleted", "A todo has been deleted.");
  };

  const confirmDelete = async (id: number) => {
    let shouldDelete;
    if (window.electronAPI) {
      shouldDelete = await window.electronAPI.showConfirmDialog(
        "Are you sure you want to delete this task?"
      );
    } else {
      shouldDelete = window.confirm(
        "Are you sure you want to delete this task?"
      );
    }
    if (shouldDelete) {
      deleteTodo(id);
    }
  };

  const toggleTodoStatus = (id: number) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id
        ? {
            ...todo,
            status: (todo.status === "Pending" ? "Completed" : "Pending") as
              | "Pending"
              | "Completed",
          }
        : todo
    );
    setTodos(updatedTodos);
    saveTodos(updatedTodos);
    showNotification(
      "Todo Status Updated",
      `A todo has been marked as ${
        updatedTodos.find((todo) => todo.id === id)?.status
      }.`
    );
  };

  const showWebNotification = (title: string, body: string) => {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  };

  const showNotification = (title: string, body: string) => {
    if (window.electronAPI) {
      window.electronAPI.showNotification(title, body);
    } else {
      if (Notification.permission === "granted") {
        showWebNotification(title, body);
      } else {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            showWebNotification(title, body);
          }
        });
      }
    }
  };

  const enableNotifications = async () => {
    if (window.electronAPI) {
      window.electronAPI.showNotification(
        "Notifications Enabled",
        "You will now receive notifications for todo list actions."
      );
    } else {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        showWebNotification(
          "Notifications Enabled",
          "You will now receive notifications for todo list actions."
        );
      }
    }
  };

  const filteredTodos =
    filter === "All" ? todos : todos.filter((todo) => todo.status === filter);

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Todo List
        </Typography>
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            label="New Todo"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTodo()}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={addTodo}
            fullWidth>
            Add Todo
          </Button>
        </Paper>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}>
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
          </Select>
        </FormControl>
        <List>
          {filteredTodos.map((todo) => (
            <ListItem key={todo.id} sx={{ bgcolor: "background.paper", mb: 1 }}>
              <ListItemText
                primary={todo.text}
                secondary={`Status: ${todo.status}`}
                sx={{
                  textDecoration:
                    todo.status === "Completed" ? "line-through" : "none",
                }}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="toggle status"
                  onClick={() => toggleTodoStatus(todo.id)}
                  style={{ marginRight: "8px" }}>
                  {todo.status === "Pending" ? (
                    <CheckIcon />
                  ) : (
                    <CheckCircleIcon style={{ color: "green" }} />
                  )}
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => confirmDelete(todo.id)}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        <Button
          variant="outlined"
          color="secondary"
          onClick={enableNotifications}
          fullWidth>
          Enable Notifications
        </Button>
      </Box>
    </Container>
  );
};

export default App;
