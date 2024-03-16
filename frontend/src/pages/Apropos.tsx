import * as React from 'react';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import { Link } from 'react-router-dom'; // Importez Link de react-router-dom
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';


function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}

      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}



// TODO remove, this demo shouldn't need to reset the theme.
const defaultTheme = createTheme();

const Apropos: React.FC = () => {
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        console.log({
            email: data.get('email'),
            password: data.get('password'),
        });
    };

    return (
        <ThemeProvider theme={defaultTheme}>
            <Navbar />
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        borderRadius: '10px',
                        backgroundImage: 'url("chemin/vers/votre/image.jpg")',
                        backgroundSize: 'cover',
                        padding: '20px',
                        backgroundColor: '#f0f0f0',
                    }}
                >
                    <Typography component="h1" variant="h5">
                        bonjour!
                    </Typography>
                    <Typography>connectez vous pour découvrir tout nos fonctionalités</Typography>
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                        Email*
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            name="email"
                            autoComplete="email"
                            autoFocus
                        />
                        Password*
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                        />
                        <Grid item xs>
                            <Link to="#">
                                Mot de passe oublié
                            </Link>
                        </Grid>
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                        >
                            se connecter
                        </Button>
                        <Grid container>
                            <Grid item>
                                envie de nous rejoindre ?
                                <Link to="/inscription" style={{ textDecoration: 'none', color: 'blue' }}>
                                    crée un compte
                                </Link>
                            </Grid>
                        </Grid>
                    </Box>
                </Box>
            </Container>
            <Footer />
        </ThemeProvider>
    );
};

export default Apropos;
