import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Box, IconButton, Card, CardContent, Typography, CardMedia } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
// Importez les images pour les slides
import slide1 from '../assets/slide 1.jpg';
import slide2 from '../assets/slide 2.jpg';
import slide3 from '../assets/slide 3.jpg';
import slide4 from '../assets/slide 4.webp';
// Importez les images pour les cartes
import plomberieImage from '../assets/plomberie.jpg';
import electriciteImage from '../assets/electricité.avif';
import securiteImage from '../assets/sécurité.jpg';
import peintureOutilImage from '../assets/peinture et outil.avif';
import perceusemarteaupeintureImage from '../assets/perçeuse, marteau et peinture.webp';
import tondeuseImage from '../assets/tondeuse.jpg';
import coudreImage from '../assets/fils à coudre.webp';
import lampeImage from '../assets/lampe.jpg';

const Ecommerce = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const slides = [
        {
            image: slide1,
            title: 'Messi',
            text: 'Messi a coup du monde',
        },
        {
            image: slide2,
            title: 'Est fort',
            text: 'Messi a coup du monde',
        },
        {
            image: slide3,
            title: 'Que',
            text: 'Messi a coup du monde',
        },
        {
            image: slide4,
            title: 'Cristiano',
            text: 'Messi a coup du monde',
        },
    ];

    const goToNextSlide = () => {
        setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);
    };

    const goToPreviousSlide = () => {
        setCurrentSlide((prevSlide) => (prevSlide - 1 + slides.length) % slides.length);
    };

    return (
        <div>
            <Navbar />
            <div>
                <Box sx={{ mt: 12, mb: 8, position: 'relative' }}>
                    {/* Carousel */}
                    <Card sx={{ position: 'relative', height: '300px' }}>
                        <CardMedia
                            component="img"
                            image={slides[currentSlide].image}
                            alt={`Slide ${currentSlide + 1}`}
                            sx={{ height: '100%', objectFit: 'cover' }}
                        />
                        <CardContent sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'white',
                            textAlign: 'center',
                            width: '100%',
                        }}>
                            <Typography variant="h5">{slides[currentSlide].title}</Typography>
                            <Typography variant="body1">{slides[currentSlide].text}</Typography>
                        </CardContent>
                    </Card>
                    {/* Flèches de navigation */}
                    <IconButton
                        sx={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'white', zIndex: 2 }}
                        onClick={goToPreviousSlide}
                    >
                        <ArrowBackIosNewIcon />
                    </IconButton>
                    <IconButton
                        sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: 'white', zIndex: 2 }}
                        onClick={goToNextSlide}
                    >
                        <ArrowForwardIosIcon />
                    </IconButton>
                    {/* Section Top catégories */}
                    <div>
                        <div style={{ backgroundColor: '#28A545', color: 'black', textAlign: 'center', padding: '10px' }}>
                            Top catégories
                        </div>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 2 }}>
                            {/* Cartes avec images importées */}
                            <Card sx={{ maxWidth: 345 }}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={plomberieImage}
                                    alt="Plomberie"
                                />
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Plomberie
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card sx={{ maxWidth: 345 }}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={electriciteImage}
                                    alt="Électricité"
                                />
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Électricité
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card sx={{ maxWidth: 345 }}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={securiteImage}
                                    alt="Sécurité"
                                />
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Sécurité
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card sx={{ maxWidth: 345 }}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={peintureOutilImage}
                                    alt="Peinture et outillage"
                                />
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Peinture et outillage
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Box>
                    </div>
                    {/* Section ventes flash */}
                    <div>
                        <div style={{ backgroundColor: '#28A545', color: 'black', textAlign: 'center', padding: '10px' }}>
                            Ventes flash
                        </div>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 2 }}>
                            {/* Cartes avec images importées */}
                            <Card sx={{ maxWidth: 345 }}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={perceusemarteaupeintureImage}
                                    alt="Perceuse, marteau et peinture"
                                />
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Perceuse, marteau et peinture
                                    </Typography>
                                    <Typography gutterBottom variant="h5" component="div">
                                        50.000fcfa
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card sx={{ maxWidth: 345 }}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={tondeuseImage}
                                    alt="Tondeuse"
                                />
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Tondeuse
                                    </Typography>
                                    <Typography gutterBottom variant="h5" component="div">
                                        50.000fcfa
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card sx={{ maxWidth: 345 }}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={coudreImage}
                                    alt="Fil à coudre"
                                />
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Fil à coudre
                                    </Typography>
                                    <Typography gutterBottom variant="h5" component="div">
                                        50.000fcfa
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card sx={{ maxWidth: 345 }}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={lampeImage}
                                    alt="Lampe"
                                />
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Lampe
                                    </Typography>
                                    <Typography gutterBottom variant="h5" component="div">
                                        50.000fcfa
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Box>
                    </div>
                </Box>
            </div>
            <Footer />
        </div>
    );
}

export default Ecommerce;
