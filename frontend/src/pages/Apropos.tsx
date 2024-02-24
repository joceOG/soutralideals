import * as React from 'react';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

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
            <Navbar></Navbar>
            <Container component="main" maxWidth="xs">
                <CssBaseline />

                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        borderRadius: '10px', // Ajoute des coins arrondis
                        backgroundImage: 'url("chemin/vers/votre/image.jpg")', // Remplacez le chemin par votre image
                        backgroundSize: 'cover', // Ajuste la taille de l'image pour couvrir tout le formulaire
                        padding: '20px', // Ajoute un espace intérieur pour que le contenu ne soit pas trop proche des bords
                        backgroundColor: '#f0f0f0', // Remplacez la couleur par celle que vous souhaitez
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

                            <Link href="#" variant="body2">
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
                                <Link href="#" variant="body2">
                                    {"crée un compte"}
                                </Link>

                            </Grid>

                        </Grid>
                    </Box>
                </Box>

            </Container>
            <Footer></Footer>
        </ThemeProvider>
    );
};

export default Apropos; 
