import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Test = () => {
    const [categories, setCategories] = useState([]); // Liste des groupes
    const [selectedCategory, setSelectedCategory] = useState(''); // ID du groupe sélectionné
    const [subcategories, setSubcategories] = useState([]); // Sous-catégories du groupe sélectionné

    // Charger les groupes depuis le backend
    useEffect(() => {
        axios
            .get('http://localhost:3000/api/groupe')
            .then((response) => {
<<<<<<< HEAD
                setCategories(response.data); 
=======
                setCategories(response.data); // Assurez-vous que `response.data` contient une liste d'objets groupe avec `id` et `nomgroupe`.
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
               
            })
            .catch((error) => {
                console.error('Erreur lors du chargement des groupes:', error);
            });
    }, []);

    // Charger les sous-catégories lorsque l'utilisateur sélectionne un groupe
    useEffect(() => {
        if (selectedCategory) {
            axios
                .get(`http://localhost:3000/api/groupe/${selectedCategory}`) // Utilisation de l'ID dans l'URL
                .then((response) => {
<<<<<<< HEAD
                    setSubcategories(response.data); 
=======
                    setSubcategories(response.data); // Assurez-vous que le backend renvoie les sous-catégories liées.
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
                  
                })
                .catch((error) => {
                    console.error('Erreur lors du chargement des sous-catégories:', error);
                });
        } else {
<<<<<<< HEAD
            setSubcategories([]); // Réinitialise les sous-catégories si aucun groupe n'est sélectionné
=======
            setSubcategories([]); // Réinitialiser les sous-catégories si aucun groupe n'est sélectionné
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
        }
    }, [selectedCategory]);

    return (
        <div style={{ margin: '20px' }}>
            <h1>Groupes et catégories</h1>

            {/* Menu déroulant des groupes */}
            <label htmlFor="categories">Groupe :</label>
            <select
                id="categories"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
            >
                <option value="">-- Sélectionnez un Groupe --</option>
                {categories.map((group) => (
                    <option key={group.id} value={group._id}>
                        {group.nomgroupe.charAt(0).toUpperCase() + group.nomgroupe.slice(1)}
                    </option>
                ))}
            </select>

            {/* Menu déroulant des sous-catégories */}
            <label htmlFor="subcategories" style={{ marginTop: '20px', display: 'block' }}>
                Sous-catégorie :
            </label>
            <select id="subcategories" disabled={!subcategories.length} >
                <option value="">-- Sélectionnez une sous-catégorie --</option>
                {subcategories.map((subcategory, index) => (
                    <option key={index} value={subcategory._id} >
<<<<<<< HEAD
                        {subcategory.nomcategorie} {/* Ajustement selon la structure des sous-catégories */}
=======
                        {subcategory.nomcategorie} {/* Ajustez selon la structure des sous-catégories */}
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
                    </option>
                ))}
            </select>
        </div>
    );
};

export default Test;
