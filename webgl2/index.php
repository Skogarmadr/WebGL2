

<h1>Exercices</h1>

<?php 

    $jsonFile = fopen("content/content.json", "r") or die("Unable to open file");
    $jsonString = fread($jsonFile, filesize("content/content.json"));
    fclose($jsonFile);

    $content = json_decode($jsonString);

    foreach($content->chapters as $chapter){
        $chapterNumber = $chapter->number;
        printf("<h2>Chapitre %d</h2>",$chapterNumber);
        print "<div class='exercices'>";
        foreach($chapter->exercices as $exercice)
        {
            printf("<a href='content/ch%02d-%s%02d/index.html'>%s</a>",$chapterNumber,$exercice->type, $exercice->number, $exercice->title);
        }

        print "</div>";

    }


?>