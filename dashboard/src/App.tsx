import React from 'react';
import './styles/App.css';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AppRouter from './routes/AppRouter';

const whiteTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2891DC' ,
    }, 
    secondary: {
      main: '#28A545',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={whiteTheme}>
      
      <main>
        <AppRouter/>
      </main>
      </ThemeProvider>
  );
}

export default App;