pipeline {
    agent any

    environment {
        // Fixed project name so cleanup always targets the same containers across builds
        COMPOSE_PROJECT_NAME = "snapshot"
        // Define the credential ID here for easier management
        SECRET_FILE_ID = 'my-app-secrets'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Prepare Environment') {
            steps {
                echo 'Securingly retrieving environment file...'
                // This creates a temporary copy of your secret file
                withCredentials([file(credentialsId: "${SECRET_FILE_ID}", variable: 'SECURE_ENV')]) {
                    // On Windows (bat), use the variable to copy it to the local .env
                    bat "copy %SECURE_ENV% .env"
                }
            }
        }

        stage('Cleanup Old Containers') {
            steps {
                bat 'docker-compose down --remove-orphans'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker-compose build'
            }
        }

        stage('Run Containers') {
            steps {
                // Docker-compose automatically picks up the .env file in the directory
                bat 'docker-compose up -d'
            }
        }

        stage('Test & Verify') {
            steps {
                sleep time: 15, unit: 'SECONDS'
                bat 'docker ps'
            }
        }
    }

    post {
        always {
            echo 'Cleaning up...'
            bat 'docker-compose down --remove-orphans'
            // Ensure the .env copy is deleted immediately
            bat 'if exist .env del .env'
            cleanWs()
        }
    }
}
