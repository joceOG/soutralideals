import React,{ useEffect, useState }from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import { CSSProperties } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { imagefrombuffer } from 'imagefrombuffer';
// Importez vos images
import { Box } from '@mui/material';
import axios from 'axios';

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

interface Item {
    idutilisateur: string;
    nomprenom: string;
    telephone: string;
    idservice: string;
    nomservice : string,
    prixmoyen: string;
    localisation: string;
    note: string;
    cni1: { 
      type:Buffer ,
      data: []
    };
    cni2: { 
        type:Buffer ,
        data: []
      };
    selfie: { 
        type:Buffer ,
        data: []
      };
    verifier: string;
  }

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

    const location = useLocation();
    console.log(location.state) ;


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

    const navigate = useNavigate();

    function toDetailsMetiers( ) {
        navigate('/DetailsMetiers');
        }

        const [prestataire, setPrestataire] = useState<Item[]>([]);
    useEffect(() => {
        // Effect hook pour récupérer les données de l'API
        const fetchData = async () => {
          let data = '';
        let config = {
          method: 'get',
          maxBodyLength: Infinity,
          url: 'http://localhost:3000/api/prestataire/'+ location.state.nomservice,
          headers: { },
          data : data
        };
        
        axios.request(config)
        .then((response) => {
          console.log(JSON.stringify(response.data));
          setPrestataire(response.data);
        })
        .catch((error) => {
          console.log(error);
        });
      
        };
      
        fetchData();
      }, []);    

    if (!prestataire) return null;
    return (
      <div>
        <Navbar></Navbar>
        
        <div>
                <Box sx={{ mt: 12 , mb : 8 }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh'}}>
                    
                    <div style={{ width: '70%' }}>
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
                            <h4>2000 annonces de prestataires</h4>
                        </div>

                        {/* Affichage des informations sur les prestataires*/}
                        { prestataire.map( (item , index ) => (
                             <div key={index} style={apartmentContainerStyle}>
                                <div style={imageContainerStyle}>
                                  <img src={imagefrombuffer({
                                      type: item.selfie.type,
                                      data: item.selfie.data,
                                    }  )}   alt="Appartement" style={{ ...imageStyle, objectFit: 'cover', width: '100%', height: '100%' }} />
                                    </div>
                                   <div style={infoContainerStyle}>
                                       <p> { item.nomprenom }</p>
                                       <p>{ item.prixmoyen }</p>
                                       <p>{ item.localisation }</p>
                                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                       <button onClick={toDetailsMetiers}>Voir détails</button>
                                       <button style={{ backgroundColor: 'transparent', border: 'none', padding: '5px' }} onClick={() => handleLikeClick(0)}>
                                       <ThumbUpIcon style={{ fontSize: 24, color: isLiked[0] ? 'blue' : 'lightblue' }} />
                                       </button>
                                    </div>
                                </div>
                            </div>

                        ))}    
     

                        {/* Ajout des boutons numérotés */}
                        <Stack spacing={2}>
                            <Pagination count={10} color="primary" />
                        </Stack>
                    </div>
                </div>
                </Box>
        </div>
        <Footer></Footer>
        </div>
    );
};

export default Prestataire;
