<?php

namespace App\Controllers;
use App\Models\Project\ProjectModel;
use CodeIgniter\HTTP\RedirectResponse;
use Config\Services;


use Exception;

class Home extends BaseController
{
    /**
     * Fonction gérant la page home du site.
     *
     * @return string
     */
    public function index(): string
    {
        $data['projects'] = ProjectModel::selectAllProjects();

        $session = session();

        $session->setFlashdata("projects", $data['projects']);

        // Construction de la vue
        return view('common/head')
            .view('common/header')
            .view('pages/home')
            .view('common/footer')
            .view('common/scripts');
    }

    /**
     * Lors du clique sur le bouton "Envoyer" du formulaire de contact
     * celui-ci redirige l'utilisateur vers l'accueil après avoir effectuer les
     * action de la fonction.
     *
     * @return RedirectResponse
     */
    public function submit(): RedirectResponse
    {
        // Vérification de la méthode POST
        if ($this->request->getMethod() === 'post') 
        {
            // Création d'une session
            $session = session();
    
            // Règles de validation du formulaire
            $validationRules = [
                'firstname' => 'required|max_length[64]',
                'lastname' => 'required|max_length[64]',
                'email' => 'required|valid_email|max_length[254]',
                'message' => 'required|max_length[2048]',
                'accept-tos' => 'required'
            ];
    
            // Messages d'erreur de validation du formulaire
            $validationMessages = [
                'firstname' => [
                    'required' => 'Veuillez saisir votre prénom.',
                    'max_length' => 'Votre prénom ne peut pas dépasser 64 caractères.'
                ],
                'lastname' => [
                    'required' => 'Veuillez saisir votre nom.',
                    'max_length' => 'Votre nom ne peut pas dépasser 64 caractères.'
                ],
                'email' => [
                    'required' => 'Veuillez saisir votre adresse e-mail.',
                    'valid_email' => 'Votre adresse e-mail n\'est pas valide.',
                    'max_length' => 'Votre adresse e-mail ne peut pas dépasser 254 caractères.'
                ],
                'message' => [
                    'required' => 'Veuillez saisir votre message.',
                    'max_length' => 'Votre message ne peut pas dépasser 2048 caractères.'
                ],
                'accept-tos' => [
                    'required' => 'Veuillez accepter les conditions générales d\'utilisation avant d\'envoyer votre message.'
                ]
            ];
    
            // Initialisation de la validation
            $validation = Services::validation();
            $validation->setRules($validationRules, $validationMessages);
    
            // Validation du formulaire
            if ($validation->withRequest($this->request)->run()) 
            {
                // Récupération des valeurs du formulaire
                $infos = [
                    'firstname' => $this->request->getPost('firstname'),
                    'lastname' => $this->request->getPost('lastname'),
                    'email' => $this->request->getPost('email'),
                    'message' => $this->request->getPost('message')
                ];
    
                // Configuration de l'e-mail
                $email = Services::email();
                $email->setTo('contact@valentin-fortin.pro');
                $email->setFrom('no-reply@valentin-fortin.pro');
                $email->setSubject('Message du portfolio');
                $email->setMessage($infos['message']);
    
                // Envoi de l'e-mail
                if (!$email->send()) {
                    // Redirection avec erreur en cas d'échec d'envoi de l'e-mail
                    $session->setFlashdata('errors', 'L\'envoi de l\'e-mail a échoué. Veuillez contacter un administrateur si le problème persiste.');
                } else {
                    // Redirection avec succès en cas de réussite d'envoi de l'e-mail
                    $session->setFlashdata('success', 'L\'e-mail a bien été envoyé !');
                }
            } else {
                // Redirection avec erreurs en cas d'erreurs de validation du formulaire
                $session->setFlashdata('errors', $validation->getErrors());
            }
        }
    
        // Redirection vers la page d'accueil
        return redirect()->back();
    }
}
