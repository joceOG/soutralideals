import React from 'react';
import Navbar from '../components/Navbar';
import Image from '../assets/patissier_professionnel.jpg';
import locationIcon from '../assets/location-sign.svg';
import callIcon from '../assets/phone-call.svg';
import Footer from '../components/Footer';
import { Box } from '@mui/material';

const DetailsMetiers: React.FC = () => {
  return (
    <div>
      <Navbar></Navbar>

      <div>
                <Box sx={{ mt: 12 , mb : 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', }}>

        <div style={{ width: '800px', height: 'auto' }}>
          <img src={Image} alt="" style={{ width: '700px', height: 'auto' }} />
          <h4><b>Description du prestataire</b></h4>
          <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ipsa adipisci, est dolorem inventore placeat odit eligendi praesentium molestiae ullam nam deserunt? Quod earum impedit aperiam ducimus, laudantium pariatur perferendis corrupti?</p>
        </div>

        <div>

          <div style={{ display: 'flex', justifyContent: 'space-around', flexDirection: 'row'}} >

            <div style={{ display: 'flex', flexDirection: 'column'}}>
              <h4><b>patissier professionnel</b></h4>
              <h4>50.000 FCFA</h4>
            </div>

            <div>
              <img src={locationIcon} alt="" style={{ width: '50px', height: '50px' }} />
            </div>

          </div>

          <div>
            <img src={callIcon} alt="" style={{ width: '20px', height: '20px' }} />
            <h5><b>contacter</b></h5>
          </div>

        </div>

      </div>

      </Box>
      </div>

      <Footer></Footer>
    </div>
  );
}

export default DetailsMetiers;