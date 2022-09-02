//SPDX-License-Identifier:MIT
pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle__NotEnoughEthEntred();
error Raffle__transferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotneeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface{

    /*type  variables */
    enum RaffleState {
        OPEN,
        CALCLATING
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant numWords = 1;
    uint16 private constant requestConfirmations = 3;

    //Lottery variables :
    address private s_recentWinner;  
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    //events -- emit inside the function enterRaffle -- the name inverted !!
    event RaffleEnter (address indexed player);
    event requestRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed recentWinner);

    constructor(
        address vrfCoordinator,
        uint256 entranceFee,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        uint64 subscriptionId,
        uint256 interval
    ) 
    VRFConsumerBaseV2(vrfCoordinator){
        
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
        i_entranceFee = entranceFee;
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }



    function enterRaffle() public payable{
        if(msg.value < i_entranceFee ){
            revert Raffle__NotEnoughEthEntred();
        }
        if(s_raffleState != RaffleState.OPEN){
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender); // stored in the logging (verbose)
    }




    // chekup keep 
    function checkUpkeep(bytes memory /* checkData*/) public override returns(bool upkeepNeeded, bytes memory /*data */){
            bool isOpen = (RaffleState.OPEN == s_raffleState);
            bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
            bool hasPlayers = (s_players.length > 0);
            bool hasBalance = address(this).balance>0;
            upkeepNeeded    = (isOpen && timePassed && hasPlayers && hasBalance);
            

    }
    // function to pick a random winner 
    function performUpkeep(bytes calldata /* checkData*/) external override{

        (bool upkeepNeeded,) =  checkUpkeep("");
        if(!upkeepNeeded){revert  Raffle__UpkeepNotneeded(address(this).balance,
                s_players.length,
                uint256(s_raffleState));}

       
        s_raffleState = RaffleState.CALCLATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
        i_gasLane,
        i_subscriptionId,
        requestConfirmations,
        i_callbackGasLimit,
        numWords
        );
        emit requestRaffleWinner(requestId);

    }




    function fulfillRandomWords (uint256 /*requestId */, uint256 []memory randomWords) internal override{
        
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState =RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        // sending funds to the winner 
        (bool success,) = recentWinner.call{value:address(this).balance}("");
        if(!success){
            revert Raffle__transferFailed();
        }
        
        emit WinnerPicked(recentWinner);
    }


    function getEntranceFee() public view returns(uint256){
        return i_entranceFee;
    }
    function getPlayer(uint256 index) public view returns(address){
        return s_players[index];
    }
    function getRecentWinner() public view returns(address){
        return s_recentWinner;
    }
    function getNumWords() public pure returns(uint32){
        return numWords;
    }
    function getNumberOfPlayers() public view returns(uint256){
        return s_players.length;
    }
    function getLatestTimeStamp() public view returns(uint256){
        return s_lastTimeStamp;
    }
    function getRequestConfirmations() public pure returns(uint256){
        return requestConfirmations;
    }
    function getRaffleState() public view returns(RaffleState){
        return s_raffleState;
    }
    function getInterval()public view returns(uint256){
        return i_interval;
    }
}