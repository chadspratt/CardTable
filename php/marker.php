<?php
class Marker
{
    public static function GetMarkersFromPlayerId($playerId)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $getMarkersQuery = $connection->prepare(
            "SELECT id, playerId, text, xPos, yPos, color
             FROM marker
             WHERE playerId = ?");
        $getMarkersQuery->bind_param("i", $playerId);
        $getMarkersQuery->execute();
        $getMarkersQuery->bind_result($id, $playerId, $text, $x, $y,
                                      $color);

        $markers = [];
        while ($getMarkersQuery->fetch())
        {
            $row = [
                "id" => $id,
                "playerId" => $playerId,
                "text" => $text,
                "x" => $x,
                "y" => $y,
                "color" => $color
            ];
            array_push($markers, $row);
        }
        $getMarkersQuery->close();
        $connection->close();

        return $markers;
    }

    public static function AddMarker($playerId, $text, $x, $y, $color)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $addMarkerQuery = $connection->prepare(
            "INSERT INTO marker (playerId, text, xPos, yPos, color)
             SELECT ?, ?, ?, ?, ?");
        $addMarkerQuery->bind_param("isiis", $playerId, $text, $x, $y, $color);
        $addMarkerQuery->execute();
        $addMarkerQuery->close();
        $connection->close();
    }

    public static function RemoveAllMarkersForPlayer($playerId)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $removePlayerMarkersQuery = $connection->prepare(
          "DELETE FROM marker
           WHERE playerId = ?");
        $removePlayerMarkersQuery->bind_param("i", $playerId);
        $removePlayerMarkersQuery->execute();
        $removePlayerMarkersQuery->close();
        $connection->close();
    }

    public static function UpdateGeometry($id, $x, $y)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $updateMarkerGeometryQuery = $connection->prepare(
            "UPDATE marker
             SET xPos = ?, yPos = ?
             WHERE id = ?");
        $updateMarkerGeometryQuery->bind_param("iii", $x, $y, $id);
        $updateMarkerGeometryQuery->execute();
        $updateMarkerGeometryQuery->close();
        $connection->close();
    }
}
?>
