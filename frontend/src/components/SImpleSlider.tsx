import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import { makeStyles } from '@mui/styles';
import { Box } from '@mui/material';
import FlexibleImageSlick from './flexibleImage/FlexibleImageSlick';
import m1 from '../assets/m1.jpg';
import axios from 'axios';
import { imagefrombuffer } from 'imagefrombuffer';
import { useNavigate } from 'react-router-dom';

const useStyles = makeStyles({
    slide: {
      textAlign: 'center',
      height: '200px', // Example height for the slides
      background: '#ccc', // Example background color
    },
  });

  interface Item {
    nomservice: string;
    imageservice: { 
      type:Buffer ,
      data: []
    };
    idcategorie: string;
  }



const SimpleSlider: React.FC = () => {
 const classes = useStyles();
const navigate = useNavigate();

 function toPrestataire( item : any ) {
  navigate('/Prestataire', { state: item});
  }

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

             
      {service.map( (item , index ) => (
         <a onClick={() => { toPrestataire(item) }}> 
          <div key={index}>
                          <img   className='imageService' src={imagefrombuffer({
                                      type: item.imageservice.type,
                                      data: item.imageservice.data,
                                    }  )}  />          
                <h3>{item.nomservice}</h3>                      
          </div>
          </a>
        ))}       



      {/* Add more slides as needed */}
    </Slider>
  );


};
  

export default SimpleSlider;
