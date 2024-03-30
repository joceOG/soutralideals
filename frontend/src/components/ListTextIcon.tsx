import React, { Component } from 'react';
import EmailIcon from '@mui/icons-material/Email';
import CallIcon from '@mui/icons-material/Call';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface Item {
  text: string;
  icon: JSX.Element;
  link?: string;
}

interface State {
  items: Item[];
}

class ListTextIcon extends Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = {
      items: [
        { text: "+225 05 95 96 32", icon: <CallIcon style={{ color:'#FFFFFF' }} />, link: "+225 05 95 96 32" },
        { text: "soutralidealsss@gmail.com", icon: <EmailIcon style={{ color:'#FFFFFF' }} />, link: "mailto:soutralidealsss@gmail.com" }, 
        { text: "notre localisation", icon: <LocationOnIcon style={{ color:'#FFFFFF' }} />, link: "https://www.google.com/maps?q=Angré+9eme+Tranche+non+loin+du+super+marché+belle+cote" } // Lien vers Google Maps
      ]
    };
  }

  render() {
    return (
        <div style={{ color:'#FDCE4D' }}>
        <ul>
          {this.state.items.map((item, index) => (
            <div key={index}>
              {item.icon} 
              {item.link ? (
                <a href={item.link}>{item.text}</a>
              ) : (
                <span>{item.text}</span>
              )}
            </div>
          ))}
        </ul>
      </div>
    );
  }
}

export default ListTextIcon;
