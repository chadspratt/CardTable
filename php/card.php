<?php
class Card
{
    public static function GetCardsFromPlayerId($playerId)
    {
        require_once 'php/zone.php';

        $queryString = "SELECT id, playerId, deckId, zone, name, imageUrl,
                        xPos, yPos, rotation, ordering
                        FROM card
                        WHERE playerId = ? AND zone != 'deck'
                        ORDER BY ordering";
        $cards = Card::_GetCards($queryString, $playerId);
        $zones = array("hand" => [],
                       "inPlay" => [],
                       "inPlayFaceDown" => [],
                       "dealtFaceDown" => []);
        foreach ($cards as $card)
        {
            array_push($zones[$card["zone"]], $card);
        }

        $zoneArray = [];
        foreach ($zones as $zoneName => $zoneCards) {
            array_push($zoneArray, new Zone($zoneName, $zoneCards));
        }
        return $zoneArray;
    }

    public static function GetCardsFromDeckId($deckId)
    {
        $queryString = "SELECT id, playerId, deckId, zone, name, imageUrl,
                        xPos, yPos, rotation, ordering
                        FROM card
                        WHERE deckId = ? AND zone = 'deck'
                        ORDER BY ordering";
        return Card::_GetCards($queryString, $deckId);
    }

    public static function _GetCards($queryString, $id)
    {
        require_once "../../db_connect/cards.inc";

        $connection = GetDatabaseConnection();
        $getCardsQuery = $connection->prepare($queryString);
        $getCardsQuery->bind_param("i", $id);
        $getCardsQuery->execute();
        $getCardsQuery->bind_result($id, $playerId, $deckId, $zone, $name,
                                    $imageUrl, $x, $y, $rotation,
                                    $ordering);
        $cards = [];
        while ($getCardsQuery->fetch())
        {
            $row = [
                "id" => $id,
                "playerId" => $playerId,
                "deckId" => $deckId,
                "zone" => $zone,
                "name" => $name,
                "imageUrl" => $imageUrl,
                "x" => $x,
                "y" => $y,
                "rotation" => $rotation,
                "ordering" => $ordering
            ];
            array_push($cards, $row);
        }
        $getCardsQuery->close();
        $connection->close();
        return $cards;
    }

    public static function AddCards($deckId, $names, $imageUrls)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $getMaxOrderingQuery = $connection->prepare(
            "SELECT max(ordering)
             FROM card
             WHERE deckId = ? AND zone = 'deck'");
        $getMaxOrderingQuery->bind_param("i", $deckId);
        $getMaxOrderingQuery->execute();
        $getMaxOrderingQuery->bind_result($maxId);
        $getMaxOrderingQuery->fetch();
        $getMaxOrderingQuery->close();
        $orderingStart = $maxId + 1;

        $addCardQuery = $connection->prepare(
            "INSERT INTO card (deckId, name, imageUrl, ordering, zone)
             SELECT ?, ?, ?, ?, 'deck'");
        $addCardQuery->bind_param("issi", $deckId, $name, $imageUrl, $ordering);

        for ($i=0; $i < count($names); $i++) {
            $name = $names[$i];
            $imageUrl = $imageUrls[$i];
            $ordering = $orderingStart + $i;
            $addCardQuery->execute();
        }
        $addCardQuery->close();
        $connection->close();
    }

    public static function RemoveAllCardsFromDeck($deckId)
    {
        require_once "../../db_connect/cards.inc";

        $connection = GetDatabaseConnection();
        $getCardsQuery = $connection->prepare(
          "DELETE FROM card
           WHERE deckId = ?");
        $getCardsQuery->bind_param("i", $deckId);
        $getCardsQuery->execute();
        $getCardsQuery->close();
        $connection->close();
    }

    public static function UpdateCard($cardId, $zone, $playerId, $x, $y,
                                      $ordering)
    {
        require_once "../../db_connect/cards.inc";

        $connection = GetDatabaseConnection();
        $updateCardZoneQuery = $connection->prepare(
            "UPDATE card
             SET zone = ?, playerId = ?, xPos = ?, yPos = ?, ordering = ?
             WHERE id = ?");
        $updateCardZoneQuery->bind_param("siiiii", $zone, $playerId, $x, $y,
                                         $ordering, $cardId);
        $updateCardZoneQuery->execute();
        $updateCardZoneQuery->close();
        $connection->close();
    }

    public static function DrawCard($deckId, $playerId)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $getTopCardIdQuery = $connection->prepare(
            "SELECT id
             FROM card
             WHERE deckId = ? AND zone = 'deck' AND ordering = (
                SELECT max(ordering)
                FROM card
                WHERE deckId = ? AND zone = 'deck')");
        $getTopCardIdQuery->bind_param("ii", $deckId, $deckId);
        $getTopCardIdQuery->execute();
        $getTopCardIdQuery->bind_result($cardId);
        $getTopCardIdQuery->fetch();
        $getTopCardIdQuery->close();
        $connection->close();
        Card::MoveToZone($cardId, $playerId, "hand", "top");
    }

    public static function DrawCardFaceDown($deckId, $playerId)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $getTopCardIdQuery = $connection->prepare(
            "SELECT id
             FROM card
             WHERE deckId = ? AND zone = 'deck' AND ordering = (
                SELECT max(ordering)
                FROM card
                WHERE deckId = ? AND zone = 'deck')");
        $getTopCardIdQuery->bind_param("ii", $deckId, $deckId);
        $getTopCardIdQuery->execute();
        $getTopCardIdQuery->bind_result($cardId);
        $getTopCardIdQuery->fetch();
        $getTopCardIdQuery->close();
        $connection->close();
        Card::MoveToZone($cardId, $playerId, "dealtFaceDown", "top");
    }

    public static function MoveToZone($cardId, $playerId, $zone, $topOrBottom)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $ordering = 0;
        // cards moving to a deck may be going to the top/bottom/etc.
        if ($zone === "deck")
        {
            if ($topOrBottom === "top")
            {
                $getMaxOrderingQuery = $connection->prepare(
                    "SELECT max(ordering)
                     FROM card
                     WHERE deckId = (
                         SELECT deckId
                         FROM card
                         WHERE id = ?)");
                $getMaxOrderingQuery->bind_param("i", $cardId);
                $getMaxOrderingQuery->execute();
                $getMaxOrderingQuery->bind_result($maxId);
                $getMaxOrderingQuery->fetch();
                $getMaxOrderingQuery->close();
                $ordering = $maxId + 1;
            }
            elseif ($topOrBottom === "bottom") {
                $getMinOrderingQuery = $connection->prepare(
                    "SELECT min(ordering)
                     FROM card
                     WHERE deckId = (
                         SELECT deckId
                         FROM card
                         WHERE id = ?)");
                $getMinOrderingQuery->bind_param("i", $cardId);
                $getMinOrderingQuery->execute();
                $getMinOrderingQuery->bind_result($minId);
                $getMinOrderingQuery->fetch();
                $getMinOrderingQuery->close();
                $ordering = $minId - 1;
            }
            // might also want to insert card randomly in to deck
            // will need to support moving multiple cards and shuffling them
            // then putting them on the top, bottom, or throughout the deck
            // might also want to put them on top or bottom in the order they
            // were drawn or the reverse
        }
        // cards moving to a player zone will go to the top of the zone's order
        else
        {
            $getMaxOrderingQuery = $connection->prepare(
                "SELECT max(ordering)
                 FROM card
                 WHERE playerId = ? AND zone = ?");
            $getMaxOrderingQuery->bind_param("is", $playerId, $zone);
            $getMaxOrderingQuery->execute();
            $getMaxOrderingQuery->bind_result($maxId);
            $getMaxOrderingQuery->fetch();
            $getMaxOrderingQuery->close();
            $ordering = $maxId + 1;
        }

        $updateCardZoneQuery = $connection->prepare(
            "UPDATE card
             SET zone = ?, ordering = ?, playerId = ?
             WHERE id = ?");
        $updateCardZoneQuery->bind_param("siii", $zone, $ordering, $playerId,
                                         $cardId);
        $updateCardZoneQuery->execute();
        $updateCardZoneQuery->close();
        $connection->close();
    }

    public static function UpdateGeometry($id, $x, $y, $rotation,
                                          $ordering)
    {
        require_once "../../db_connect/cards.inc";

        $connection = GetDatabaseConnection();
        $updateCardGeometryQuery = $connection->prepare(
            "UPDATE card
             SET xPos = ?, yPos = ?, rotation = ?, ordering = ?
             WHERE id = ?");
        $updateCardGeometryQuery->bind_param("iiiii", $x, $y, $rotation,
                                             $ordering, $id);
        $updateCardGeometryQuery->execute();
        $updateCardGeometryQuery->close();
        $connection->close();
    }

    public static function UpdateRotation($id, $rotation)
    {
        require_once "../../db_connect/cards.inc";

        $connection = GetDatabaseConnection();
        $updateCardGeometryQuery = $connection->prepare(
            "UPDATE card
             SET rotation = ?
             WHERE id = ?");
        $updateCardGeometryQuery->bind_param("ii", $rotation, $id);
        $updateCardGeometryQuery->execute();
        $updateCardGeometryQuery->close();
        $connection->close();
    }

    public static function UpdateOwner($id, $playerId, $x, $y)
    {
        require_once "../../db_connect/cards.inc";

        $connection = GetDatabaseConnection();
        $updateCardGeometryQuery = $connection->prepare(
            "UPDATE card
             SET playerId = ?, xPos = ?, yPos = ?
             WHERE id = ?");
        $updateCardGeometryQuery->bind_param("iiii", $playerId, $x, $y, $id);
        $updateCardGeometryQuery->execute();
        $updateCardGeometryQuery->close();
        $connection->close();
    }

    public static function UnrotatePlayerCards($playerId)
    {
        require_once "../../db_connect/cards.inc";

        $connection = GetDatabaseConnection();
        $updateCardGeometryQuery = $connection->prepare(
            "UPDATE card
             SET rotation = 0
             WHERE playerId = ?");
        $updateCardGeometryQuery->bind_param("i", $playerId);
        $updateCardGeometryQuery->execute();
        $updateCardGeometryQuery->close();
        $connection->close();
    }
}
?>
