import * as React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';

// Importez vos images
import appartementImage51 from '../assets/5 pièces 1.webp';
import appartementImage7 from '../assets/7 pièces.jpg';
import appartementImage52 from '../assets/5 pièces 2.jpg';
import appartementImage3 from '../assets/3 pièces.webp';

const defaultTheme = createTheme();

const Prestataire = () => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const totalPages = 11; // Nombre total de pages

    // Fonction pour changer de page
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Style pour les images des appartements
    const imageStyle = {
        width: '170px',
        height: '125px',
    };

    // Style pour le conteneur des boutons numérotés
    const buttonContainerStyle = {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '20px',
    };

    // Style pour les boutons numérotés
    const buttonStyle = {
        margin: '0 5px',
        padding: '5px 10px',
        borderRadius: '5px',
        cursor: 'pointer',
        backgroundColor: '#e0e0e0',
        border: 'none',
    };

    return (
        <ThemeProvider theme={defaultTheme}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div style={{backgroundColor: 'yellow'}}>
                    <div style={{ textAlign: 'center', backgroundColor: 'violet' }}>
                        <h1>SOUTRALI DEALS</h1>
                        <h3>APPARTEMENT</h3>
                    </div>
                    
                    <div>
                        <Typography>choisir localisation</Typography>
                        <Popover
                            id="mouse-over-popover"
                            sx={{
                                pointerEvents: 'none',
                            }}
                            open={false}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            disableRestoreFocus
                        >
                            <Typography sx={{ p: 1 }}>I use Popover.</Typography>
                        </Popover>
                    </div>
                    <div>
                        <h4>2000 annonces d'appartement</h4>
                    </div>

                    {/* Affichage des informations sur les appartements */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ marginRight: '20px' }}>
                            <img src={appartementImage51} alt="Appartement" style={imageStyle} />
                        </div>
                        <div>
                            <p>À partir de 2.000.000 FCFA</p>
                            <p>Appartement 5 pièces Abobo Belle Ville</p>
                            <button>Voir détails</button>
                        </div>
                    </div>


                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ marginRight: '20px' }}>
                            <img src={appartementImage7} alt="Appartement" style={imageStyle} />
                        </div>
                        <div>
                            <p>À partir de 10.000.000 FCFA</p>
                            <p>Appartement 7 pièces Angré Chateau</p>
                            <button>Voir détails</button>
                        </div>
                    </div>


                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ marginRight: '20px' }}>
                            <img src={appartementImage52} alt="Appartement" style={imageStyle} />
                        </div>
                        <div>
                            <p>À partir de 5.000.000 FCFA</p>
                            <p>Appartement 5 pièces Abatta</p>
                            <button>Voir détails</button>
                        </div>
                    </div>


                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ marginRight: '20px' }}>
                            <img src={appartementImage3} alt="Appartement" style={imageStyle} />
                        </div>
                        <div>
                            <p>À partir de 5.000.000 FCFA</p>
                            <p>Appartement 5 pièces Port Bouet</p>
                            <button>Voir détails</button>
                        </div>
                    </div>

                    {/* Ajout des boutons numérotés */}
                    <div style={buttonContainerStyle}>
                        {[...Array(totalPages)].map((_, index) => (
                            <button
                                key={index + 1}
                                style={{
                                    ...buttonStyle,
                                    backgroundColor: currentPage === index + 1 ? '#2196f3' : '#e0e0e0',
                                    color: currentPage === index + 1 ? '#ffffff' : '#000000',
                                }}
                                onClick={() => handlePageChange(index + 1)}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
};

export default Prestataire;
