import React, { Component } from 'react';

interface ItemListState {
  items: string[];
}

class ListText extends Component<{}, ItemListState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      items: [
        "Accueil",
        "Réservations",
        "Nos services",
        "A propos",
        "Contactez nous"
      ]
    };
  }

  render() {
    return (
      <div style={{ color:'#1d1d1b' }}>
        <ul>
          {this.state.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }
}

export default ListText;