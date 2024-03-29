import React from 'react';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import './styles/App.css';
import AppRouter from './routes/AppRouter';
import { ThemeProvider, createTheme } from '@mui/material/styles';
//import CssBaseline from '@mui/material/CssBaseline';


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

