import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AppDrawer from '../components/Drawer';
import UserList from '../pages/user_type/UserList';
import UserForm from '../pages/user_type/UserForm';

interface UserData {
  id: number;
  name: string;
  email: string;
}

const AppRouter: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  const addUser = (name: string, email: string) => {
    const newUser: UserData = {
      id: users.length + 1,
      name,
      email,
    };
    setUsers([...users, newUser]);
  };

  const updateUser = (id: number, name: string, email: string) => {
    setUsers(users.map(user => (user.id === id ? { ...user, name, email } : user)));
    setEditingUser(null);
  };

  const deleteUsers = (selectedIds: readonly number[]) => {
    const newUsers = users.filter(user => !selectedIds.includes(user.id));
    setUsers(newUsers);
  };

  return (
    <Router>
      <Routes>
        <Route path="/AppDrawer" element={<AppDrawer />} />
        <Route 
          path="/UserList" 
          element={
            <UserList 
              users={users} 
              deleteUsers={deleteUsers} 
              setEditingUser={setEditingUser} 
            />
          } 
        />
        <Route 
          path="/UserForm" 
          element={<UserForm addUser={addUser} />} 
        />
        {editingUser && (
          <Route 
            path="/EditUserForm" 
            element={
              <UserForm 
                addUser={(name, email) => updateUser(editingUser.id, name, email)} 
                initialData={editingUser} 
              />
            } 
          />
        )}
      </Routes>
    </Router>
  );
};

export default AppRouter;
