import React, { useEffect, useState } from 'react';
import { Typography, Card, CardContent, CardActions, Button, Grid, CircularProgress, Alert, Snackbar } from '@mui/material';
import axios from 'axios';

interface UserMetrics {
  totalUsers: number;
}


export interface Item {
  _id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  genre: string;
  note: string;
  photoProfil?: string;// Cloudinary image URL
  motdepasse?: string; // Password field
}

const Home: React.FC = () => {
  // State for user metrics and loading

  const [utilisateurs, setUtilisateurs] = useState<Item[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetrics>({
    totalUsers: utilisateurs.length,
  }) ;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchUserMetrics = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/utilisateurs'); // Replace with your API endpoint
        setUtilisateurs(response.data);
        setUserMetrics({
          totalUsers: utilisateurs.length,
        });
        console.log(utilisateurs.length) ;
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch user metrics');
        setLoading(false);
      }
    };

    fetchUserMetrics();

  }, []);

  // Handle button click event
  const handleViewDetails = (metricType: string) => {
    console.log(`View details for: ${metricType}`);
    // You can add more logic here to handle view details action
  };

  return (
    <div>
      {/* Main Title */}
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Welcome Message */}
      <Typography variant="body1" paragraph>
        Bienvenue sur le Dashboard de Soutrali DEALS
      </Typography>

      {/* Show loading indicator while data is being fetched */}
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {/* Display error message if fetching data fails */}
          {error && <Alert severity="error">{error}</Alert>}

          {/* Grid Container for a Single Row of Cards */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ maxWidth: 345 }}>
                <CardContent>
                  <Typography variant="h5" component="div">
                    Total Users
                  </Typography>
                  <Typography variant="h6" component="div">
                    {userMetrics.totalUsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total number of users connected to your site.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleViewDetails('totalUsers')}>
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card sx={{ maxWidth: 345 }}>
                <CardContent>
                  <Typography variant="h5" component="div">
                    Active Users
                  </Typography>
                  <Typography variant="h6" component="div">
                    
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Number of users currently active on your site.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleViewDetails('activeUsers')}>
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card sx={{ maxWidth: 345 }}>
                <CardContent>
                  <Typography variant="h5" component="div">
                    New Users
                  </Typography>
                  <Typography variant="h6" component="div">
                    
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Number of new users registered recently.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleViewDetails('newUsers')}>
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </div>
  );
};

export default Home;
