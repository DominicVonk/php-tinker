<?php
class PHPTinker
{
    public static function table($data)
    {
        $first = false;
        echo '<table>';
        foreach ($data as $row) {
            if (!$first) {
                $first = true;
                echo '<tr>';
                foreach ($row as $column => $v) {
                    echo '<td>';
                    echo $column;
                    echo '</td>';
                }
                echo '</tr>';
            }
            echo '<tr>';
            foreach ($row as $column) {
                echo '<td>';
                echo $column;
                echo '</td>';
            }
            echo '</tr>';
        }
        echo '</table>';
    }
}