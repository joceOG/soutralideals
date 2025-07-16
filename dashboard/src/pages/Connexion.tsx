import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Alert,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import logo from '../assets/logo.png';



// Erreur et Succès


const Connexion: React.FC = () => {
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
            const response = await axios.post("http://localhost:3000/api/login", {
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



  


    const theme = useTheme();
    const gradient = `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`;

    return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: gradient,
        p: 2,
      }}
    >
            
            <Container component="main" maxWidth="xs">
                
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
                    <img src={logo} alt="Logo" style={{ width: 120, marginBottom: 16 }} />
                    <Typography component="h6" variant="h6" sx={{ fontWeight: 600 }}>
                        Bienvenue !
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
                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
                    </Box>
                </Box>
                </Container>
        </Box>
    );
};

export default Connexion;
