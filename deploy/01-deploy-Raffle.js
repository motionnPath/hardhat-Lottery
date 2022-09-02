const { network,getNamedAccounts,deployments, ethers  } = require("hardhat");
const {developementChains, networkConfig} = require("../helper-hardhat-config");
const {verify} = require("../utils/verify.js")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")

module.exports = async function({getNamedAccounts,deployments}) {

    const {deploy,log} = deployments;
    let deployer = (await getNamedAccounts()).deployer;
    const chainId = network.config.chainId;
    let vrfCoordinatorV2Address, subscriptionId,vrfCoordinatorV2Mock;
    let raffle;
    if(chainId == 31337){
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()

       
        subscriptionId = transactionReceipt.events[0].args.subId;
        log(subscriptionId)
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId.toNumber(),VRF_SUB_FUND_AMOUNT)
        
    }else{
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }
    
    const entranceFee       = networkConfig[chainId]["entranceFee"];
    const gasLane           = networkConfig[chainId]["gasLane"];
    const callbackGasLimit  = networkConfig[chainId]["callbackGasLimit"];
    const interval          = networkConfig[chainId]["interval"];
    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        callbackGasLimit,
        subscriptionId,
        interval 

    ]
 
    raffle = await deploy('Raffle',{
        from:deployer,
        args:args,
        log:true,
        waitConfirmations: 1,
    })
    log("raffle adddr ========",raffle.address)
   
    
    
    
    if(!developementChains.includes(network.name) && process.env.ETHERSCAN_API_KEY){
        log("verifing ... ");
        await verify(raffle.address, args)
    }
     
    log('-------------------------------------------------------------')


}

module.exports.tags = ["all","raffle"]