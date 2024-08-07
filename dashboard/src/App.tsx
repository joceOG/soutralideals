import React from 'react';
import './styles/App.css';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Dashboard from './routes/Dashboard';
import 'primereact/resources/themes/saga-blue/theme.css';  // Theme
import 'primereact/resources/primereact.min.css';          // Core CSS
import 'primeicons/primeicons.css';                        // Icons
import 'primeflex/primeflex.css'; 
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
        <Dashboard/>
      </main>
      </ThemeProvider>
  );
}

export default App;

