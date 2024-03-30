import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import React from 'react';
import ListText from './ListText';
import ListTextIcon from './ListTextIcon';
import SocialMediaIcon from './SocialMediaIcon';

const Footer: React.FC = () => {
  return <div style={{background:'#28a545'}}>
         <Container style={{ backgroundColor:'#ff1423;'}}>
            <Box style={{ backgroundColor:'#ff1423;'}}>
            <Grid container style={{ backgroundColor:'#ff1423;'}} >
                <Grid item xs={3}>
                    <Box sx={{ mt: 10}}>
                    <h1><b>SOUTRALI DEALS</b></h1>
                    </Box>
                    <Box sx={{ mt: 2 , mb:5 }}>
                    <ListText/>
                    </Box>
                </Grid>
                <Grid item xs={6}>
                <Box sx={{ mt: 12}}>
                <Typography>
                Nous sommes une équipe de passionnés dont le but est d'améliorer la vie de chacun.
                Nos services s'adressent aux petites et moyennes entreprises.
                </Typography>
                </Box>
                <Box sx={{ mt: 3.5}}>
                  <ListTextIcon/>
                </Box>
                </Grid>
                <Grid item xs={3}>
                <SocialMediaIcon/>
                </Grid>
                </Grid>
               
            </Box>


         </Container>

  </div>;
};

export default Footer;