import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';

function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="https://mui.com/">
        Your Website
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

// TODO remove, this demo shouldn't need to reset the theme.
const defaultTheme = createTheme();

export default function SignIn() {
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
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: '10px',
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
        <Copyright sx={{ mt: 8, mb: 4 }} />
      </Container>
    </ThemeProvider>
  );
}