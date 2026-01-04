import React, { useState } from 'react';
import { Chip, TextField, Box } from '@mui/material';

interface TagsInputProps {
  tags: string[];
  onChange: (newTags: string[]) => void;
  label?: string;
  placeholder?: string;
}

const TagsInput: React.FC<TagsInputProps> = ({
  tags,
  onChange,
  label = "Tags",
  placeholder = "Appuyez sur Entrée pour ajouter"
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission
      addTag();
    }
  };

  const addTag = () => {
    const trimmedInput = inputValue.trim();
    if (trimmedInput && !tags.includes(trimmedInput)) {
      onChange([...tags, trimmedInput]);
      setInputValue('');
    }
  };

  const handleDelete = (tagToDelete: string) => {
    onChange(tags.filter((tag) => tag !== tagToDelete));
  };

  return (
    <Box sx={{ mt: 2, mb: 1 }}>
      <TextField
        fullWidth
        label={label}
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag} // Also add on blur
        helperText="Appuyez sur Entrée ou cliquez ailleurs pour ajouter le tag"
        variant="outlined"
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {tags.map((tag, index) => (
          <Chip
            key={index}
            label={tag}
            onDelete={() => handleDelete(tag)}
            color="primary"
            variant="outlined"
          />
        ))}
      </Box>
    </Box>
  );
};

export default TagsInput;
