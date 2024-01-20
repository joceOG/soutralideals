import React, { FC, ChangeEvent } from 'react';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';



interface SearchFieldProps {
  onSearch: (query: string) => void
}

const SearchField: FC<SearchFieldProps> = ({ onSearch }) => {
 
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    console.log('Search') ;
    const query = event.target.value;
  
    onSearch(query);
  };

 

  return (
    <div>
      <TextField
        placeholder="Rechercher"
        variant="outlined"
        fullWidth
        onChange={handleSearch}
        InputProps={{
          style: { color: "black" , background:"white" , height:'30px' , width: '380px', padding:'5px' , borderRadius:'5px' },
          endAdornment: (
            <IconButton 
            onClick={() => onSearch('query')}>
              <SearchIcon />
            </IconButton>
          ),
        }}
      />
    </div>
  );
};

export default SearchField;