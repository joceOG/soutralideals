module.exports.signUpError = (err)=>{

    let errors = {pseudo:'',email:'',password:''}
    if (err.message.includes('pseudo')) {

        errors.pseudo = "Pseudo trop court !"
        
    }
    if (err.message.includes('email')) {

        errors.email = "email incorrect !"
    }
    if (err.message.includes('password')) {

        errors.password = "Le mot de passe doit faire minimum 6 caractere !"
    }
    if(err.code==11000 && err.errmsg.includes('email')){
        errors.email = "L'email est deja utilisé !"
    }
    if(err.code==11000 && err.errmsg.includes('pseudo')){
        errors.pseudo = "Le pseudo est deja utilisé !"
    }

    return errors

}

module.exports.signInError = (err) =>{
    let errors = {email:'',passwword:''}

    if (err.message.includes('email')) {

        errors.email = "L'email ne correspond pas"   
    }
    if (err.message.includes('password')) {

        errors.password = "Le mot de passe ne correspond pas"   
    }

    return errors;

}