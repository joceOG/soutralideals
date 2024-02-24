//import { Directions } from '@mui/icons-material';
import React, { Component } from 'react';
//import { Row } from 'rsuite';

export default class Footer extends Component {
    render() {
        return (
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-around" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <h3>A propos de soutrali deals</h3>
                </div>

                <div>
                    <h3>Mention légales</h3>
                    <h3>Des questions ?</h3>
                </div>

                <div>
                    <h3>Téléchargez notre application</h3>
                    <p>
                        
                    </p>
                </div>

                <div>
                    <h3>Réseaux sociaux</h3>
                    <p>
                        
                    </p>
                </div>
            </div>
        );
    }
}