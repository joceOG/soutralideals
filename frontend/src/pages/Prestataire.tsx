import * as React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import { CSSProperties } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Importez vos images
import appartementImage51 from '../assets/5 pièces 1.webp';
import appartementImage7 from '../assets/7 pièces.jpg';
import appartementImage52 from '../assets/5 pièces 2.jpg';
import appartementImage3 from '../assets/3 pièces.webp';

const customTheme = createTheme({
    palette: {
        primary: {
            main: '#0f8a18', // Vert
        },
        secondary: {
            main: '#318ec9', // Bleu
        },
        text: {
            primary: '#ffffff', // Blanc
        },
    },
    typography: {
        fontFamily: ['Arial', 'Helvetica', 'sans-serif'].join(','),
    },
});

const titleContainerStyle: CSSProperties = {
    backgroundColor: '#0f8a18', // Vert
    color: '#ffffff', // Blanc
    borderRadius: '10px',
    padding: '20px',
    width: '100%', // Utilise 100% de la largeur de son conteneur
    marginBottom: '20px', // Ajoute cette ligne pour l'espace entre le titre et le reste du contenu
    boxSizing: 'border-box',
};

const infoContainerStyle: CSSProperties = {
    backgroundColor: '#318ec9', // Bleu
    color: '#ffffff', // Blanc
    padding: '65px',
    borderRadius: '10px',
    flex: '1',
    justifyContent: 'flex-start', // Modifier cette ligne
};

// Style pour les images des appartements
const imageStyle = {
    width: '170px',
    height: '125px',
};

// Style pour le conteneur des informations sur les appartements
const apartmentContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
};

// Style pour le conteneur de l'image
const imageContainerStyle = {
    marginRight: '20px',
    width: '250px',
    height: '250px',
    borderRadius: '10px',
    overflow: 'hidden',
};

const Prestataire: React.FC = () => { 
    const [isLiked, setIsLiked] = React.useState([false, false, false, false]);
    const [open, setOpen] = React.useState(false);
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setOpen(true);
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setOpen(false);
        setAnchorEl(null);
    };

    const handleLikeClick = (index: number) => {
        setIsLiked(prevState => {
            const newState = [...prevState];
            newState[index] = !newState[index];
            return newState;
        });
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <Navbar />
            <div style={{ backgroundColor: '#318ec9', width: '800px' }}>
                <div style={titleContainerStyle}>
                    <div style={{ textAlign: 'center' }}>
                        <h1>SOUTRALI DEALS</h1>
                        <h3>APPARTEMENT</h3>
                    </div>
                </div>

                <div>
                    <Typography
                        aria-owns={open ? 'mouse-over-popover' : undefined}
                        aria-haspopup="true"
                        onMouseEnter={handlePopoverOpen}
                        onMouseLeave={handlePopoverClose}
                    >
                        choisir la localisation
                    </Typography>
                    <Popover
                        id="mouse-over-popover"
                        sx={{
                            pointerEvents: 'none',
                        }}
                        open={open}
                        anchorEl={anchorEl}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'left',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        onClose={handlePopoverClose}
                        disableRestoreFocus
                    >
                        <Typography sx={{ p: 1 }}>I use Popover.</Typography>
                    </Popover>
                </div>

                <div>
                    <h4>2000 annonces d'appartement</h4>
                </div>

                {/* Affichage des informations sur les appartements */}
                <div style={apartmentContainerStyle}>
                    <div style={imageContainerStyle}>
                        <img src={appartementImage51} alt="Appartement" style={{ ...imageStyle, objectFit: 'cover', width: '100%', height: '100%' }} />
                    </div>
                    <div style={infoContainerStyle}>
                        <p>À partir de 2.000.000 FCFA</p>
                        <p>Appartement 5 pièces Abobo Belle Ville</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button>Voir détails</button>
                            <button style={{ backgroundColor: 'transparent', border: 'none', padding: '5px' }} onClick={() => handleLikeClick(0)}>
                                <ThumbUpIcon style={{ fontSize: 24, color: isLiked[0] ? 'blue' : 'lightblue' }} />
                            </button>
                        </div>
                    </div>
                </div>

                <div style={apartmentContainerStyle}>
                    <div style={imageContainerStyle}>
                        <img src={appartementImage7} alt="Appartement" style={{ ...imageStyle, objectFit: 'cover', width: '100%', height: '100%' }} />
                    </div>
                    <div style={infoContainerStyle}>
                        <p>À partir de 10.000.000 FCFA</p>
                        <p>Appartement 7 pièces Angré Chateau</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button>Voir détails</button>
                            <button style={{ backgroundColor: 'transparent', border: 'none', padding: '5px' }} onClick={() => handleLikeClick(1)}>
                                <ThumbUpIcon style={{ fontSize: 24, color: isLiked[1] ? 'blue' : 'lightblue' }} />
                            </button>
                        </div>
                    </div>
                </div>

                <div style={apartmentContainerStyle}>
                    <div style={imageContainerStyle}>
                        <img src={appartementImage52} alt="Appartement" style={{ ...imageStyle, objectFit: 'cover', width: '100%', height: '100%' }} />
                    </div>
                    <div style={infoContainerStyle}>
                        <p>À partir de 5.000.000 FCFA</p>
                        <p>Appartement 5 pièces Abatta</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button>Voir détails</button>
                            <button style={{ backgroundColor: 'transparent', border: 'none', padding: '5px' }} onClick={() => handleLikeClick(2)}>
                                <ThumbUpIcon style={{ fontSize: 24, color: isLiked[2] ? 'blue' : 'lightblue' }} />
                            </button>
                        </div>
                    </div>
                </div>

                <div style={apartmentContainerStyle}>
                    <div style={imageContainerStyle}>
                        <img src={appartementImage3} alt="Appartement" style={{ ...imageStyle, objectFit: 'cover', width: '100%', height: '100%' }} />
                    </div>
                    <div style={infoContainerStyle}>
                        <p>À partir de 5.000.000 FCFA</p>
                        <p>Appartement 3 pièces Port Bouet</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button>Voir détails</button>
                            <button style={{ backgroundColor: 'transparent', border: 'none', padding: '5px' }} onClick={() => handleLikeClick(3)}>
                                <ThumbUpIcon style={{ fontSize: 24, color: isLiked[3] ? 'blue' : 'lightblue' }} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Ajout des boutons numérotés */}
                <Stack spacing={2}>
                    <Pagination count={10} color="primary" />
                </Stack>
            </div>
        </div>
    );
};

export default Prestataire;
