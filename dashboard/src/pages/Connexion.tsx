import * as React from 'react';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import { Link,useNavigate } from 'react-router-dom'; // Importez Link de react-router-dom
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import axios from 'axios'



// TODO remove, this demo shouldn't need to reset the theme.
const defaultTheme = createTheme();

// Erreur et Succès


const Connexion: React.FC = () => {
     const apiUrl = process.env.REACT_APP_API_URL || '';
    const navigate=useNavigate()
    const [error, setError] = React.useState('');
const [success, setSuccess] = React.useState('');
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        // console.log({
        //     email: data.get('email'),
        //     password: data.get('password'),
        // });
        setError("");
        setSuccess("");
        let email=data.get('email')
        let password=data.get('password')

        try {
            const response = await axios.post(`${apiUrl}/api/login`, {
                email,
                password,
            });
            // setSuccess("Login successful! Token: " + response.data.token);
            setSuccess("Login successful! " + response.data.token);
            setTimeout(()=>{
            navigate('/')
            },3000)
            
        } catch (err) {
            // if (err.response) {
            //     setError(err.response.data.error);
            // } else {
                setError("An unexpected error occurred.");
            // }
        }
    };



  


    return (
        <ThemeProvider theme={defaultTheme}>
            <p>Navbar</p>
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
                        {error && <p style={{ color: "red" }}>{error}</p>}
                        {success && <p style={{ color: "green" }}>{success}</p>}
                    </Box>
                </Box>
            </Container>
            <p>Footer</p>
        </ThemeProvider>
    );
};

export default Connexion;
