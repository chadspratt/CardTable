<?php
/**
 * Zone for now defines enums for the different zones used by the game engine
 */
class Zone
{
    public static $zoneEnums = array("deck" => 0,
                                     "hand" => 1,
                                     "inPlay" => 2,
                                     "inPlayFaceDown" => 3);

    public $name;
    public $cards;
    public $enumId;

    function __construct($name, $cards)
    {
        $this->name = $name;
        $this->enumId = Zone::$zoneEnums[$name];
        $this->cards = $cards;
    }

    public function AddCard($card)
    {
        array_push($this->cards, $card);
    }
} ?>