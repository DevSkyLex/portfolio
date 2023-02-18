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
        if($this->request->getMethod() === "post")
        {
            // Création d'une session
            $session = session();

            // Règles du formulaire
            $rules = array(
                'firstname' => 'required|max_length[64]',
                'lastname' => 'required|max_length[64]',
                'email' => 'required|valid_email|max_length[254]',
                'message' => 'required|max_length[2048]',
                'accept-tos' => 'required'
            );

            // Messages d'erreur des règles du formulaire
            $errors = array(
                'firstname' => [
                    'required' => "Veuillez saisir votre prénom.",
                    'max_length' => "Votre prénom ne peut pas être égale ou supérieur à 64 caractères.",
                ],
                'lastname' => [
                    'required' => "Veuillez saisir votre nom.",
                    'max_length' => "Votre nom ne peut pas être égale ou supérieur à 64 caractères.",
                ],
                'email' => [
                    'required' => "Veuillez saisir votre adresse email.",
                    'valid_email' => "Votre adresse email n'est pas valide.",
                    'max_length' => "Votre adresse email ne peut pas être égale ou supérieur à 254 caractères.",
                ],
                'message' => [
                    'required' => "Veuillez saisir votre message.",
                    'max_length' => "Votre message ne peut pas être égale ou supérieur à 2048 caractères.",
                ],
                'accept-tos' => [
                    'required' => "Veuillez accepter les conditions générales d'utilisation avant d'envoyer votre message."
                ]
            );

            // Mise en place des règles du formulaire
            $validation = Services::validation();
            $validation->setRules($rules, $errors);

            // Passage des valeurs des champs aux contrôles par règles
            if($this->validate($rules, $errors))
            {
                // Récupération des valeurs des champs du formulaire
                $infos = array(
                    "firstname" => $this->request->getPost('firstname'),
                    "lastname" => $this->request->getPost('lastname'),
                    "email" => $this->request->getPost('email'),
                    "message" => $this->request->getPost('message'),
                );

                // Mise en place des emails
                $email = Services::email();

                $email->setTo("contact@valentin-fortin.pro");
                $email->setFrom("no-reply@valentin-fortin.pro");
                $email->setSubject("Message du portfolio");
                $email->setMessage($infos['message']);

                // Envoi et contrôle de l'envoi du mail
                if(!$email->send())
                {
                }
            }
            else {
                // Redirection vers la page d'accueil avec les erreurs
                return redirect()->back()->withInput()->with('errors', $validation->getErrors());
            }
        }

        // Redirection vers la page d'accueil
        return redirect()->back();
    }
}
