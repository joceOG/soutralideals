import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import { makeStyles } from '@mui/styles';
import { Box } from '@mui/material';
import FlexibleImageSlick from './flexibleImage/FlexibleImageSlick';
import m1 from '../assets/m1.jpg';
import axios from 'axios';
import { imagefrombuffer } from 'imagefrombuffer';

const useStyles = makeStyles({
    slide: {
      textAlign: 'center',
      height: '200px', // Example height for the slides
      background: '#ccc', // Example background color
    },
  });

  interface Item {
    idservice:string;
    nomservice: string;
    imageservice: Buffer;
    idcategorie: string;
  }


const SimpleSlider: React.FC = () => {
 const classes = useStyles();

 const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
  };

const [service, setService] = useState<Item[]>([]);

useEffect(() => {
  // Effect hook pour récupérer les données de l'API
  const fetchData = async () => {
    let data = '';
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'http://localhost:3000/api/service',
    headers: { },
    data : data
  };
  
  axios.request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
    setService(response.data);
  })
  .catch((error) => {
    console.log(error);
  });

  };

  fetchData();
}, []);

if (!service) return null;

  return (
    <Slider {...settings}>
      <div >
        <Box className={classes.slide} sx={{ mt:1, mb:1 , mr:2 , ml:2 }}>
          <FlexibleImageSlick src={m1} alt="Carroussel"></FlexibleImageSlick>
        </Box>
      </div>
             
      {service.map(item => (
          <div key={item.idservice}>
            <img src={imagefrombuffer({
                                      type: item.imageservice,
                                      data: item.imageservice,
                                    })} alt="Service" />
            <h3>{item.nomservice}</h3>
          </div>
        ))}       



      {/* Add more slides as needed */}
    </Slider>
  );


};
  

export default SimpleSlider;