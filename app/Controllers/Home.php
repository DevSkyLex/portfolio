<?php

namespace App\Controllers;
use App\Models\Project\ProjectModel;
use Config\Services;

class Home extends BaseController
{
    public function index()
    {
        $data['projects'] = ProjectModel::selectAllProjects();


        // var_dump($data['projects']);
        $session = session();

        $session->setFlashdata("projects", $data['projects']);

        // Construction de la vue
        return view('common/head')
            .view('common/header')
            .view('pages/home')
            .view('common/footer')
            .view('common/scripts');
    }
}
