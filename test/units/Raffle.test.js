const {developementChains,networkConfig} = require("../../helper-hardhat-config");
const {network, getNamedAccounts, deployments, ethers} = require("hardhat");
const { assert, expect } = require("chai");




!developementChains.includes(network.name)? describe.skip :describe("Raffle unit tests",function(){

        let raffle, vrfCoordinatorV2Mock, chainId, raffleEntrancefee,deployer, interval;
        beforeEach(async function(){
            deployer  = (await getNamedAccounts()).deployer
            await deployments.fixture(["all"])
            raffle = await ethers.getContract("Raffle",deployer);
            vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock',deployer);
            raffleEntrancefee = await raffle.getEntranceFee()
            interval = await raffle.getInterval();
        })

        describe("constructor", function(){
            it('Initializes the raffle corectly',async function(){
                const raffleState = await raffle.getRaffleState();
                chainId = network.config.chainId;
                assert.equal(raffleState.toString(),"0");
                assert.equal(interval,networkConfig[chainId]["interval"])
            })
        })

        describe("EnterRaffle", function () {
            it("shold check if enough entrance fees", async function (){

                await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughEthEntred")

            })
            it("records players when entred ", async function(){
                await raffle.enterRaffle({value: raffleEntrancefee})
                assert.equal(await raffle.getPlayer(0), deployer)
            })
            it('emits an event on enter', async function(){
                await expect(raffle.enterRaffle({value: raffleEntrancefee})).to.emit(raffle,"RaffleEnter")
            })
            it('does not allow entrance while state calculating', async function(){
                await raffle.enterRaffle({value: raffleEntrancefee})
                await network.provider.send("evm_increaseTime",[interval.toNumber() + 1]) // it is like to travel in time 
                await network.provider.send("evm_mine",[]) // mining an other block
                // that way we don't have to wait for interval duration 
                await raffle.performUpkeep([]) // now we should turn into calculating state 
                await expect(raffle.enterRaffle({value:raffleEntrancefee})).to.be.revertedWith("Raffle__NotOpen")

            })
        })

        describe("checkUpKeep", function (){

            it("return false if people havn't enter",async function(){
                await network.provider.send("evm_increaseTime",[interval.toNumber() + 1])
                await network.provider.send("evm_mine",[])
                const {upkeepNeeded}= await raffle.callStatic.checkUpkeep([])
                assert(!upkeepNeeded)
            })

            it("retrns false if raffle isn't open", async function(){
                await raffle.enterRaffle({value: raffleEntrancefee})
                await network.provider.send("evm_increaseTime",[interval.toNumber() + 1])
                await network.provider.send("evm_mine",[])
                await raffle.performUpkeep([])
                const raffleState = await raffle.getRaffleState() 
                const {upkeepNeeded}= await raffle.callStatic.checkUpkeep([])
                assert.equal(raffleState,"1")
                assert.equal(upkeepNeeded,false)
            })
            
            it("returns false if enough time hasn't passed", async function(){
                await raffle.enterRaffle({value: raffleEntrancefee})
                await network.provider.send("evm_increaseTime",[interval.toNumber() - 1])
                await network.provider.send("evm_mine",[]) // same as next line
                // await network.provider.request({method:"evm_mine",params:[]})
                const {upkeepNeeded}= await raffle.callStatic.checkUpkeep([])
                //assert.equal(upkeepNeeded,false)
                assert(!upkeepNeeded)

            })
            it("returns true if enough time has passed", async function(){
                await raffle.enterRaffle({value: raffleEntrancefee})
                await network.provider.send("evm_increaseTime",[interval.toNumber() + 1])
                await network.provider.send("evm_mine",[]) // same as next line
                // await network.provider.request({method:"evm_mine",params:[]})
                const {upkeepNeeded}= await raffle.callStatic.checkUpkeep([])
                //assert.equal(upkeepNeeded,true)
                assert(upkeepNeeded)

            })
        })
        describe("performUpkeep", function(){

            it("can only run if checkupkeep returns true", async function(){

                await raffle.enterRaffle({value:raffleEntrancefee});
                await network.provider.send("evm_increaseTime",[interval.toNumber() + 1])
                await network.provider.send("evm_mine",[])
                const tx = await raffle.performUpkeep([])
                assert(tx)
            })
            it("reverts when checkpkeep is false",async function(){

                await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotneeded")

            })
            it("updates Raffle state, emits an event, and calls the vrf coordinator",async function(){
                await raffle.enterRaffle({value:raffleEntrancefee});
                await network.provider.send("evm_increaseTime",[interval.toNumber() + 1])
                await network.provider.send("evm_mine",[])
                const txResponse = await raffle.performUpkeep([])
                const txReceipt = await txResponse.wait(1)
                const requestId = await txReceipt.events[1].args.requestId
                // i_vrfCoordinator.requestRandomWords emits allready an event so it would be events[0]
                // and we emit the second event thats why it shows at txReceipt.events[1]
                const raffleState = await raffle.getRaffleState()
                assert(requestId.toNumber()  > 0)
                assert(raffleState.toString() == 1)
            })
        })

        describe ("fulfillRandomWords", function(){

            beforeEach(async function(){

                await raffle.enterRaffle({value:raffleEntrancefee});
                await network.provider.send("evm_increaseTime",[interval.toNumber()+1])
                await network.provider.send("evm_mine",[])

            })
            it("can only be called after performupkeep",async function(){
                //make sure to check the vrfCoordinatorV2Mock contract 
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0,raffle.address)).to.be.revertedWith("nonexistent request")
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1,raffle.address)).to.be.revertedWith("nonexistent request")
            })

            // the promise test thing 


            it("picks a winner, resets the lottery, and sends money", async function(){

               
                const additionalEntrants = 3
                const startingAccountIndex = 1 // deployer = 0
                let accounts = await ethers.getSigners()
                for(let i =startingAccountIndex; i< startingAccountIndex + additionalEntrants; i++){
                    const accountConnectedRaffle = raffle.connect(accounts[i])
                    await accountConnectedRaffle.enterRaffle({value:raffleEntrancefee})
                }
                const startingTimeStamp = await raffle.getLatestTimeStamp()

                
                //this is a listner waiting for winnerpicked event !!!
                await new Promise(async function(resolve,reject){

                   

                    raffle.once("WinnerPicked",async()=>{

                        //console.log('found the event')
                        resolve()
                        try {
                            // find out the winner threw the biggest balance 

                            /*console.log((await accounts[0].getBalance()).toString())
                            console.log((await accounts[1].getBalance()).toString())
                            console.log((await accounts[2].getBalance()).toString())
                            console.log((await accounts[3].getBalance()).toString()) */

                            const winnersFinalBalance = winnersStartingBalance.add(raffleEntrancefee.mul(additionalEntrants+1)).toString()
                            const recentWinner = await raffle.getRecentWinner()
                            const raffleState = await raffle.getRaffleState()
                            const endingTimeStamp = await raffle.getLatestTimeStamp()
                            const numPlayers = await raffle.getNumberOfPlayers()

                            // checking the winnners balance 
                            assert.equal(winnersFinalBalance,await recentWinner.getBalance()) // same as next line 
                            assert.equal(winnersFinalBalance,(await accounts[1].getBalance()).toString())
                            // checking the winner addr 
                            assert.equal(recentWinner,accounts[1])
                            assert.equal(numPlayers.toString(),"0")
                            assert.equal(raffleState.toString(),"0")
                            assert(endingTimeStamp > startingTimeStamp)
                            assert()
                            resolve()

                        }catch(e){
                            console.log(e)
                            reject(e)
                        }
                        

                    })
                    
                    const tx = await raffle.performUpkeep([])
                    const txReceipt = await tx.wait(1)
                    // here mocking  chainlink vrf
                    const  winnersStartingBalance = await accounts[2].getBalance()
                    
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt.events[1].args.requestId, 
                        raffle.address
                    )
                   
                })

                
            })


        })


})