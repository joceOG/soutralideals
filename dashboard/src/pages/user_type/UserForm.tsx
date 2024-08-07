import React, { useState, useEffect } from 'react';
import { Box, Button, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface UserFormProps {
  addUser: (name: string, email: string) => void;
  initialData?: { name: string; email: string };
}

const UserForm: React.FC<UserFormProps> = ({ addUser, initialData }) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
    }
  }, [initialData]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    addUser(name, email);
    navigate('/UserList'); // Rediriger vers UserList après l'ajout ou la modification
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" variant="contained" color="primary">
        {initialData ? 'Update User' : 'Add User'}
      </Button>
    </Box>
  );
};

export default UserForm;
