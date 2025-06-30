import React from "react";
// import { Story, Meta } from "@storybook/react/types-6-0";
import { Diagram, DiagramProps } from "../components/Diagram";
import { Meta, StoryObj } from "@storybook/react";

const resourceModel: any = {
    "inSequence": {
        "mediatorList": [
            {
                "then": {
                    "mediatorList": [
                        {
                            "source": {
                                "type": "none",
                                "range": {
                                    "startTagRange": {
                                        "start": {
                                            "line": 8,
                                            "character": 20
                                        },
                                        "end": {
                                            "line": 8,
                                            "character": 55
                                        }
                                    },
                                    "endTagRange": {
                                        "start": {
                                            "line": 8,
                                            "character": 55
                                        },
                                        "end": {
                                            "line": 8,
                                            "character": 64
                                        }
                                    }
                                },
                                "hasTextNode": false,
                                "selfClosed": false,
                                "tag": "source"
                            },
                            "target": {
                                "type": "body",
                                "range": {
                                    "startTagRange": {
                                        "start": {
                                            "line": 10,
                                            "character": 20
                                        },
                                        "end": {
                                            "line": 10,
                                            "character": 40
                                        }
                                    },
                                    "endTagRange": {
                                        "start": {
                                            "line": 10,
                                            "character": 40
                                        },
                                        "end": {
                                            "line": 10,
                                            "character": 49
                                        }
                                    }
                                },
                                "hasTextNode": false,
                                "selfClosed": false,
                                "tag": "target"
                            },
                            "endpoint": {
                                "type": "NAMED_ENDPOINT",
                                "range": {
                                    "startTagRange": {
                                        "start": {
                                            "line": 7,
                                            "character": 16
                                        },
                                        "end": {
                                            "line": 7,
                                            "character": 28
                                        }
                                    },
                                    "endTagRange": {}
                                },
                                "hasTextNode": false,
                                "selfClosed": true,
                                "tag": "endpoint"
                            },
                            "blocking": false,
                            "range": {
                                "startTagRange": {
                                    "start": {
                                        "line": 6,
                                        "character": 16
                                    },
                                    "end": {
                                        "line": 6,
                                        "character": 39
                                    }
                                },
                                "endTagRange": {
                                    "start": {
                                        "line": 11,
                                        "character": 16
                                    },
                                    "end": {
                                        "line": 11,
                                        "character": 23
                                    }
                                }
                            },
                            "hasTextNode": false,
                            "selfClosed": false,
                            "tag": "call"
                        }
                    ],
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 5,
                                "character": 16
                            },
                            "end": {
                                "line": 5,
                                "character": 22
                            }
                        },
                        "endTagRange": {
                            "start": {
                                "line": 12,
                                "character": 16
                            },
                            "end": {
                                "line": 12,
                                "character": 23
                            }
                        }
                    },
                    "hasTextNode": false,
                    "selfClosed": false,
                    "tag": "then"
                },
                "else_": {
                    "mediatorList": [],
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 13,
                                "character": 16
                            },
                            "end": {
                                "line": 13,
                                "character": 22
                            }
                        },
                        "endTagRange": {
                            "start": {
                                "line": 14,
                                "character": 16
                            },
                            "end": {
                                "line": 14,
                                "character": 23
                            }
                        }
                    },
                    "hasTextNode": true,
                    "textNode": "\n                ",
                    "selfClosed": false,
                    "tag": "else"
                },
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 4,
                            "character": 12
                        },
                        "end": {
                            "line": 4,
                            "character": 21
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 15,
                            "character": 12
                        },
                        "end": {
                            "line": 15,
                            "character": 21
                        }
                    }
                },
                "hasTextNode": false,
                "selfClosed": false,
                "tag": "filter"
            },
            {
                "property": [],
                "level": "simple",
                "category": "INFO",
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 16,
                            "character": 12
                        },
                        "end": {
                            "line": 16,
                            "character": 50
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 17,
                            "character": 12
                        },
                        "end": {
                            "line": 17,
                            "character": 18
                        }
                    }
                },
                "hasTextNode": true,
                "textNode": "\n            ",
                "selfClosed": false,
                "description": "looooooooooooooong description",
                "tag": "log"
            },
            {
                "key": "Sequence",
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 18,
                            "character": 12
                        },
                        "end": {
                            "line": 18,
                            "character": 40
                        }
                    },
                    "endTagRange": {}
                },
                "hasTextNode": false,
                "selfClosed": true,
                "tag": "sequence"
            },
            {
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 19,
                            "character": 12
                        },
                        "end": {
                            "line": 19,
                            "character": 24
                        }
                    },
                    "endTagRange": {}
                },
                "hasTextNode": false,
                "selfClosed": true,
                "tag": "loopback"
            }
        ],
        "range": {
            "startTagRange": {
                "start": {
                    "line": 3,
                    "character": 12
                },
                "end": {
                    "line": 3,
                    "character": 24
                }
            },
            "endTagRange": {
                "start": {
                    "line": 20,
                    "character": 12
                },
                "end": {
                    "line": 20,
                    "character": 25
                }
            }
        },
        "hasTextNode": false,
        "selfClosed": false,
        "tag": "inSequence"
    },
    "outSequence": {
        "mediatorList": [],
        "range": {
            "startTagRange": {
                "start": {
                    "line": 21,
                    "character": 12
                },
                "end": {
                    "line": 21,
                    "character": 25
                }
            },
            "endTagRange": {
                "start": {
                    "line": 22,
                    "character": 12
                },
                "end": {
                    "line": 22,
                    "character": 26
                }
            }
        },
        "hasTextNode": true,
        "textNode": "\n            ",
        "selfClosed": false,
        "tag": "outSequence"
    },
    "faultSequence": {
        "mediatorList": [],
        "range": {
            "startTagRange": {
                "start": {
                    "line": 23,
                    "character": 12
                },
                "end": {
                    "line": 23,
                    "character": 27
                }
            },
            "endTagRange": {
                "start": {
                    "line": 24,
                    "character": 12
                },
                "end": {
                    "line": 24,
                    "character": 28
                }
            }
        },
        "hasTextNode": true,
        "textNode": "\n            ",
        "selfClosed": false,
        "tag": "faultSequence"
    },
    "methods": [
        "GET"
    ],
    "uriTemplate": "/resource",
    "range": {
        "startTagRange": {
            "start": {
                "line": 2,
                "character": 8
            },
            "end": {
                "line": 2,
                "character": 57
            }
        },
        "endTagRange": {
            "start": {
                "line": 25,
                "character": 8
            },
            "end": {
                "line": 25,
                "character": 19
            }
        }
    },
    "hasTextNode": false,
    "selfClosed": false,
    "tag": "resource"
};

const meta: Meta<typeof Diagram> = {
    title: 'Diagram',
    component: Diagram,
    argTypes: {
        model: resourceModel,
    },
};

export default meta;
type Story = StoryObj<typeof Diagram>;

export const Primary: Story = {};
Primary.args = {
    model: resourceModel
};

export const Sequence: Story = {};
Sequence.args = {
    model: {
        "mediatorList": [
            {
                "correlateOnOrCompleteConditionOrOnComplete": {
                    "completeCondition": {
                        "messageCount": {
                            "min": "-1",
                            "max": "-1",
                            "range": {
                                "startTagRange": {
                                    "start": {
                                        "line": 4,
                                        "character": 12
                                    },
                                    "end": {
                                        "line": 4,
                                        "character": 45
                                    }
                                },
                                "endTagRange": {}
                            },
                            "hasTextNode": false,
                            "selfClosed": true,
                            "tag": "messageCount"
                        },
                        "timeout": 0,
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 3,
                                    "character": 8
                                },
                                "end": {
                                    "line": 3,
                                    "character": 27
                                }
                            },
                            "endTagRange": {
                                "start": {
                                    "line": 5,
                                    "character": 8
                                },
                                "end": {
                                    "line": 5,
                                    "character": 28
                                }
                            }
                        },
                        "hasTextNode": false,
                        "selfClosed": false,
                        "tag": "completeCondition"
                    },
                    "onComplete": {
                        "mediators": [],
                        "expression": "$ctx:esfadf",
                        "aggregateElementType": "root",
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 6,
                                    "character": 8
                                },
                                "end": {
                                    "line": 6,
                                    "character": 74
                                }
                            },
                            "endTagRange": {}
                        },
                        "hasTextNode": false,
                        "selfClosed": true,
                        "tag": "onComplete"
                    },
                    "hasTextNode": false,
                    "selfClosed": false
                },
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 2,
                            "character": 4
                        },
                        "end": {
                            "line": 2,
                            "character": 15
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 7,
                            "character": 4
                        },
                        "end": {
                            "line": 7,
                            "character": 16
                        }
                    }
                },
                "hasTextNode": false,
                "selfClosed": false,
                "tag": "aggregate"
            },
            {
                "target": [
                    {
                        "sequence": {
                            "mediatorList": [],
                            "range": {
                                "startTagRange": {
                                    "start": {
                                        "line": 10,
                                        "character": 12
                                    },
                                    "end": {
                                        "line": 10,
                                        "character": 23
                                    }
                                },
                                "endTagRange": {}
                            },
                            "hasTextNode": false,
                            "selfClosed": true,
                            "tag": "sequence"
                        },
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 9,
                                    "character": 8
                                },
                                "end": {
                                    "line": 9,
                                    "character": 16
                                }
                            },
                            "endTagRange": {
                                "start": {
                                    "line": 11,
                                    "character": 8
                                },
                                "end": {
                                    "line": 11,
                                    "character": 17
                                }
                            }
                        },
                        "hasTextNode": false,
                        "selfClosed": false,
                        "tag": "target"
                    }
                ],
                "continueParent": false,
                "sequential": false,
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 8,
                            "character": 4
                        },
                        "end": {
                            "line": 8,
                            "character": 11
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 12,
                            "character": 4
                        },
                        "end": {
                            "line": 12,
                            "character": 12
                        }
                    }
                },
                "hasTextNode": false,
                "selfClosed": false,
                "tag": "clone"
            },
            {
                "target": [
                    {
                        "sequence": {
                            "mediatorList": [],
                            "range": {
                                "startTagRange": {
                                    "start": {
                                        "line": 15,
                                        "character": 12
                                    },
                                    "end": {
                                        "line": 15,
                                        "character": 23
                                    }
                                },
                                "endTagRange": {}
                            },
                            "hasTextNode": false,
                            "selfClosed": true,
                            "tag": "sequence"
                        },
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 14,
                                    "character": 8
                                },
                                "end": {
                                    "line": 14,
                                    "character": 16
                                }
                            },
                            "endTagRange": {
                                "start": {
                                    "line": 16,
                                    "character": 8
                                },
                                "end": {
                                    "line": 16,
                                    "character": 17
                                }
                            }
                        },
                        "hasTextNode": false,
                        "selfClosed": false,
                        "tag": "target"
                    }
                ],
                "sequential": false,
                "continueParent": false,
                "expression": "$ctx:aefa",
                "preservePayload": false,
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 13,
                            "character": 4
                        },
                        "end": {
                            "line": 13,
                            "character": 36
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 17,
                            "character": 4
                        },
                        "end": {
                            "line": 17,
                            "character": 14
                        }
                    }
                },
                "hasTextNode": false,
                "selfClosed": false,
                "tag": "iterate"
            },
            {
                "sequence": {
                    "mediatorList": [],
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 19,
                                "character": 8
                            },
                            "end": {
                                "line": 19,
                                "character": 19
                            }
                        },
                        "endTagRange": {}
                    },
                    "hasTextNode": false,
                    "selfClosed": true,
                    "tag": "sequence"
                },
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 18,
                            "character": 4
                        },
                        "end": {
                            "line": 18,
                            "character": 27
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 20,
                            "character": 4
                        },
                        "end": {
                            "line": 20,
                            "character": 14
                        }
                    }
                },
                "hasTextNode": false,
                "selfClosed": false,
                "tag": "foreach"
            },
            {
                "onReject": {
                    "mediatorList": [],
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 22,
                                "character": 8
                            },
                            "end": {
                                "line": 22,
                                "character": 19
                            }
                        },
                        "endTagRange": {}
                    },
                    "hasTextNode": false,
                    "selfClosed": true,
                    "tag": "onReject"
                },
                "onAccept": {
                    "mediatorList": [],
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 23,
                                "character": 8
                            },
                            "end": {
                                "line": 23,
                                "character": 19
                            }
                        },
                        "endTagRange": {}
                    },
                    "hasTextNode": false,
                    "selfClosed": true,
                    "tag": "onAccept"
                },
                "advice": {
                    "mediatorList": [],
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 25,
                                "character": 8
                            },
                            "end": {
                                "line": 25,
                                "character": 17
                            }
                        },
                        "endTagRange": {}
                    },
                    "hasTextNode": false,
                    "selfClosed": true,
                    "tag": "advice"
                },
                "obligations": {
                    "mediatorList": [],
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 24,
                                "character": 8
                            },
                            "end": {
                                "line": 24,
                                "character": 22
                            }
                        },
                        "endTagRange": {}
                    },
                    "hasTextNode": false,
                    "selfClosed": true,
                    "tag": "obligations"
                },
                "callbackClass": "org.wso2.carbon.identity.entitlement.mediator.callback.UTEntitlementCallbackHandler",
                "client": "basicAuth",
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 21,
                            "character": 4
                        },
                        "end": {
                            "line": 21,
                            "character": 213
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 26,
                            "character": 4
                        },
                        "end": {
                            "line": 26,
                            "character": 25
                        }
                    }
                },
                "hasTextNode": false,
                "selfClosed": false,
                "tag": "entitlementService"
            },
            {
                "remoteServiceUrl": "https://adfa/",
                "username": "aef",
                "password": "aef",
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 27,
                            "character": 4
                        },
                        "end": {
                            "line": 27,
                            "character": 82
                        }
                    },
                    "endTagRange": {}
                },
                "hasTextNode": false,
                "selfClosed": true,
                "tag": "oauthService"
            },
            {
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 28,
                            "character": 4
                        },
                        "end": {
                            "line": 28,
                            "character": 68
                        }
                    },
                    "endTagRange": {}
                },
                "hasTextNode": false,
                "selfClosed": true,
                "tag": "NTLM"
            },
            {
                "source": {
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 31,
                                "character": 8
                            },
                            "end": {
                                "line": 31,
                                "character": 21
                            }
                        },
                        "endTagRange": {}
                    },
                    "hasTextNode": false,
                    "selfClosed": true,
                    "tag": "brs:source"
                },
                "target": {
                    "action": "replace",
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 32,
                                "character": 8
                            },
                            "end": {
                                "line": 32,
                                "character": 62
                            }
                        },
                        "endTagRange": {}
                    },
                    "hasTextNode": false,
                    "selfClosed": true,
                    "tag": "brs:target"
                },
                "ruleSet": {
                    "properties": {
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 34,
                                    "character": 12
                                },
                                "end": {
                                    "line": 34,
                                    "character": 29
                                }
                            },
                            "endTagRange": {}
                        },
                        "hasTextNode": false,
                        "selfClosed": true,
                        "tag": "brs:properties"
                    },
                    "rule": {
                        "value": "<![CDATA[<code/>]]>",
                        "resourceType": "regular",
                        "sourceType": "inline",
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 35,
                                    "character": 12
                                },
                                "end": {
                                    "line": 35,
                                    "character": 65
                                }
                            },
                            "endTagRange": {
                                "start": {
                                    "line": 35,
                                    "character": 84
                                },
                                "end": {
                                    "line": 35,
                                    "character": 95
                                }
                            }
                        },
                        "hasTextNode": false,
                        "selfClosed": false,
                        "tag": "brs:rule"
                    },
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 33,
                                "character": 8
                            },
                            "end": {
                                "line": 33,
                                "character": 21
                            }
                        },
                        "endTagRange": {
                            "start": {
                                "line": 36,
                                "character": 8
                            },
                            "end": {
                                "line": 36,
                                "character": 22
                            }
                        }
                    },
                    "hasTextNode": false,
                    "selfClosed": false,
                    "tag": "brs:ruleSet"
                },
                "input": {
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 37,
                                "character": 8
                            },
                            "end": {
                                "line": 37,
                                "character": 20
                            }
                        },
                        "endTagRange": {}
                    },
                    "hasTextNode": false,
                    "selfClosed": true,
                    "tag": "brs:input"
                },
                "output": {
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 38,
                                "character": 8
                            },
                            "end": {
                                "line": 38,
                                "character": 21
                            }
                        },
                        "endTagRange": {}
                    },
                    "hasTextNode": false,
                    "selfClosed": true,
                    "tag": "brs:output"
                },
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 30,
                            "character": 4
                        },
                        "end": {
                            "line": 30,
                            "character": 55
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 39,
                            "character": 4
                        },
                        "end": {
                            "line": 39,
                            "character": 15
                        }
                    }
                },
                "hasTextNode": false,
                "selfClosed": false,
                "tag": "brs:rule"
            },
            {
                "serverProfile": {
                    "streamConfig": {
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 42,
                                    "character": 12
                                },
                                "end": {
                                    "line": 42,
                                    "character": 46
                                }
                            },
                            "endTagRange": {}
                        },
                        "hasTextNode": false,
                        "selfClosed": true,
                        "tag": "streamConfig"
                    },
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 41,
                                "character": 8
                            },
                            "end": {
                                "line": 41,
                                "character": 31
                            }
                        },
                        "endTagRange": {
                            "start": {
                                "line": 43,
                                "character": 8
                            },
                            "end": {
                                "line": 43,
                                "character": 24
                            }
                        }
                    },
                    "hasTextNode": false,
                    "selfClosed": false,
                    "tag": "serverProfile"
                },
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 40,
                            "character": 4
                        },
                        "end": {
                            "line": 40,
                            "character": 9
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 44,
                            "character": 4
                        },
                        "end": {
                            "line": 44,
                            "character": 10
                        }
                    }
                },
                "hasTextNode": false,
                "selfClosed": false,
                "tag": "bam"
            },
            {
                "attributes": {
                    "meta": {
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 50,
                                    "character": 12
                                },
                                "end": {
                                    "line": 50,
                                    "character": 19
                                }
                            },
                            "endTagRange": {}
                        },
                        "hasTextNode": false,
                        "selfClosed": true,
                        "tag": "meta"
                    },
                    "correlation": {
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 51,
                                    "character": 12
                                },
                                "end": {
                                    "line": 51,
                                    "character": 26
                                }
                            },
                            "endTagRange": {}
                        },
                        "hasTextNode": false,
                        "selfClosed": true,
                        "tag": "correlation"
                    },
                    "payload": {
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 52,
                                    "character": 12
                                },
                                "end": {
                                    "line": 52,
                                    "character": 22
                                }
                            },
                            "endTagRange": {}
                        },
                        "hasTextNode": false,
                        "selfClosed": true,
                        "tag": "payload"
                    },
                    "arbitrary": {
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 53,
                                    "character": 12
                                },
                                "end": {
                                    "line": 53,
                                    "character": 24
                                }
                            },
                            "endTagRange": {}
                        },
                        "hasTextNode": false,
                        "selfClosed": true,
                        "tag": "arbitrary"
                    },
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 49,
                                "character": 8
                            },
                            "end": {
                                "line": 49,
                                "character": 20
                            }
                        },
                        "endTagRange": {
                            "start": {
                                "line": 54,
                                "character": 8
                            },
                            "end": {
                                "line": 54,
                                "character": 21
                            }
                        }
                    },
                    "hasTextNode": false,
                    "selfClosed": false,
                    "tag": "attributes"
                },
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 45,
                            "character": 4
                        },
                        "end": {
                            "line": 45,
                            "character": 31
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 55,
                            "character": 4
                        },
                        "end": {
                            "line": 55,
                            "character": 19
                        }
                    }
                },
                "hasTextNode": false,
                "selfClosed": false,
                "tag": "publishEvent"
            }
        ],
        "name": "defseq",
        "trace": "disable",
        "range": {
            "startTagRange": {
                "start": {
                    "line": 1,
                    "character": 0
                },
                "end": {
                    "line": 1,
                    "character": 80
                }
            },
            "endTagRange": {
                "start": {
                    "line": 56,
                    "character": 0
                },
                "end": {
                    "line": 56,
                    "character": 11
                }
            }
        },
        "hasTextNode": false,
        "selfClosed": false,
        "tag": "sequence"
    }
};


export const Filter: Story = {};
Filter.args = {
    model: {
        inSequence: {
            mediatorList: [
                {
                    then: {
                        mediatorList: [],
                        range: {
                            startTagRange: {
                                start: {
                                    line: 7,
                                    character: 12
                                },
                                end: {
                                    line: 7,
                                    character: 18
                                }
                            },
                            endTagRange: {
                                start: {
                                    line: 15,
                                    character: 12
                                },
                                end: {
                                    line: 15,
                                    character: 19
                                }
                            }
                        },
                        hasTextNode: false,
                        selfClosed: false,
                        tag: "then"
                    },
                    else_: {
                        mediatorList: [],
                        range: {
                            startTagRange: {
                                start: {
                                    line: 16,
                                    character: 12
                                },
                                end: {
                                    line: 16,
                                    character: 18
                                }
                            },
                            endTagRange: {
                                start: {
                                    line: 17,
                                    character: 12
                                },
                                end: {
                                    line: 17,
                                    character: 19
                                }
                            }
                        },
                        hasTextNode: true,
                        textNode: "\n            ",
                        selfClosed: false,
                        tag: "else"
                    },
                    range: {
                        startTagRange: {
                            start: {
                                line: 6,
                                character: 8
                            },
                            end: {
                                line: 6,
                                character: 17
                            }
                        },
                        endTagRange: {
                            start: {
                                line: 18,
                                character: 8
                            },
                            end: {
                                line: 18,
                                character: 17
                            }
                        }
                    },
                    hasTextNode: false,
                    selfClosed: false,
                    tag: "filter"
                }
            ],
            range: {
                startTagRange: {
                    start: {
                        line: 5,
                        character: 8
                    },
                    end: {
                        line: 5,
                        character: 20
                    }
                },
                endTagRange: {
                    start: {
                        line: 23,
                        character: 8
                    },
                    end: {
                        line: 23,
                        character: 21
                    }
                }
            },
            hasTextNode: false,
            selfClosed: false,
            tag: "inSequence"
        },
        outSequence: {
            mediatorList: [],
            range: {
                startTagRange: {
                    start: {
                        line: 24,
                        character: 8
                    },
                    end: {
                        line: 24,
                        character: 21
                    }
                },
                endTagRange: {
                    start: {
                        line: 26,
                        character: 8
                    },
                    end: {
                        line: 26,
                        character: 22
                    }
                }
            },
            hasTextNode: true,
            textNode: "\n        \n        ",
            selfClosed: false,
            tag: "outSequence"
        },
        methods: [
            "POST",
            "GET"
        ],
        uriTemplate: "/resource",
        range: {
            startTagRange: {
                start: {
                    line: 4,
                    character: 4
                },
                end: {
                    line: 4,
                    character: 58
                }
            },
            endTagRange: {
                start: {
                    line: 27,
                    character: 4
                },
                end: {
                    line: 27,
                    character: 15
                }
            }
        },
        hasTextNode: false,
        selfClosed: false,
        tag: "resource"
    }
};


export const NestedFilter: Story = {};
NestedFilter.args = {
    model: {
        "inSequence": {
            "mediatorList": [
                {
                    "then": {
                        "mediatorList": [],
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 5,
                                    "character": 16
                                },
                                "end": {
                                    "line": 5,
                                    "character": 22
                                }
                            },
                            "endTagRange": {
                                "start": {
                                    "line": 7,
                                    "character": 16
                                },
                                "end": {
                                    "line": 7,
                                    "character": 23
                                }
                            }
                        },
                        "hasTextNode": true,
                        "textNode": "\n\n                ",
                        "selfClosed": false,
                        "tag": "then"
                    },
                    "else_": {
                        "mediatorList": [
                            {
                                "then": {
                                    "mediatorList": [
                                        {
                                            "then": {
                                                "mediatorList": [
                                                    {
                                                        "then": {
                                                            "mediatorList": [],
                                                            "range": {
                                                                "startTagRange": {
                                                                    "start": {
                                                                        "line": 14,
                                                                        "character": 40
                                                                    },
                                                                    "end": {
                                                                        "line": 14,
                                                                        "character": 46
                                                                    }
                                                                },
                                                                "endTagRange": {
                                                                    "start": {
                                                                        "line": 15,
                                                                        "character": 40
                                                                    },
                                                                    "end": {
                                                                        "line": 15,
                                                                        "character": 47
                                                                    }
                                                                }
                                                            },
                                                            "hasTextNode": true,
                                                            "textNode": "\n                                        ",
                                                            "selfClosed": false,
                                                            "tag": "then"
                                                        },
                                                        "else_": {
                                                            "mediatorList": [],
                                                            "range": {
                                                                "startTagRange": {
                                                                    "start": {
                                                                        "line": 16,
                                                                        "character": 40
                                                                    },
                                                                    "end": {
                                                                        "line": 16,
                                                                        "character": 46
                                                                    }
                                                                },
                                                                "endTagRange": {
                                                                    "start": {
                                                                        "line": 17,
                                                                        "character": 40
                                                                    },
                                                                    "end": {
                                                                        "line": 17,
                                                                        "character": 47
                                                                    }
                                                                }
                                                            },
                                                            "hasTextNode": true,
                                                            "textNode": "\n                                        ",
                                                            "selfClosed": false,
                                                            "tag": "else"
                                                        },
                                                        "range": {
                                                            "startTagRange": {
                                                                "start": {
                                                                    "line": 13,
                                                                    "character": 36
                                                                },
                                                                "end": {
                                                                    "line": 13,
                                                                    "character": 44
                                                                }
                                                            },
                                                            "endTagRange": {
                                                                "start": {
                                                                    "line": 18,
                                                                    "character": 36
                                                                },
                                                                "end": {
                                                                    "line": 18,
                                                                    "character": 45
                                                                }
                                                            }
                                                        },
                                                        "hasTextNode": false,
                                                        "selfClosed": false,
                                                        "tag": "filter"
                                                    }
                                                ],
                                                "range": {
                                                    "startTagRange": {
                                                        "start": {
                                                            "line": 12,
                                                            "character": 32
                                                        },
                                                        "end": {
                                                            "line": 12,
                                                            "character": 38
                                                        }
                                                    },
                                                    "endTagRange": {
                                                        "start": {
                                                            "line": 19,
                                                            "character": 32
                                                        },
                                                        "end": {
                                                            "line": 19,
                                                            "character": 39
                                                        }
                                                    }
                                                },
                                                "hasTextNode": false,
                                                "selfClosed": false,
                                                "tag": "then"
                                            },
                                            "else_": {
                                                "mediatorList": [],
                                                "range": {
                                                    "startTagRange": {
                                                        "start": {
                                                            "line": 20,
                                                            "character": 32
                                                        },
                                                        "end": {
                                                            "line": 20,
                                                            "character": 38
                                                        }
                                                    },
                                                    "endTagRange": {
                                                        "start": {
                                                            "line": 21,
                                                            "character": 32
                                                        },
                                                        "end": {
                                                            "line": 21,
                                                            "character": 39
                                                        }
                                                    }
                                                },
                                                "hasTextNode": true,
                                                "textNode": "\n                                ",
                                                "selfClosed": false,
                                                "tag": "else"
                                            },
                                            "range": {
                                                "startTagRange": {
                                                    "start": {
                                                        "line": 11,
                                                        "character": 28
                                                    },
                                                    "end": {
                                                        "line": 11,
                                                        "character": 36
                                                    }
                                                },
                                                "endTagRange": {
                                                    "start": {
                                                        "line": 22,
                                                        "character": 28
                                                    },
                                                    "end": {
                                                        "line": 22,
                                                        "character": 37
                                                    }
                                                }
                                            },
                                            "hasTextNode": false,
                                            "selfClosed": false,
                                            "tag": "filter"
                                        }
                                    ],
                                    "range": {
                                        "startTagRange": {
                                            "start": {
                                                "line": 10,
                                                "character": 24
                                            },
                                            "end": {
                                                "line": 10,
                                                "character": 30
                                            }
                                        },
                                        "endTagRange": {
                                            "start": {
                                                "line": 23,
                                                "character": 24
                                            },
                                            "end": {
                                                "line": 23,
                                                "character": 31
                                            }
                                        }
                                    },
                                    "hasTextNode": false,
                                    "selfClosed": false,
                                    "tag": "then"
                                },
                                "else_": {
                                    "mediatorList": [],
                                    "range": {
                                        "startTagRange": {
                                            "start": {
                                                "line": 24,
                                                "character": 24
                                            },
                                            "end": {
                                                "line": 24,
                                                "character": 30
                                            }
                                        },
                                        "endTagRange": {
                                            "start": {
                                                "line": 25,
                                                "character": 24
                                            },
                                            "end": {
                                                "line": 25,
                                                "character": 31
                                            }
                                        }
                                    },
                                    "hasTextNode": true,
                                    "textNode": "\n                        ",
                                    "selfClosed": false,
                                    "tag": "else"
                                },
                                "range": {
                                    "startTagRange": {
                                        "start": {
                                            "line": 9,
                                            "character": 20
                                        },
                                        "end": {
                                            "line": 9,
                                            "character": 28
                                        }
                                    },
                                    "endTagRange": {
                                        "start": {
                                            "line": 26,
                                            "character": 20
                                        },
                                        "end": {
                                            "line": 26,
                                            "character": 29
                                        }
                                    }
                                },
                                "hasTextNode": false,
                                "selfClosed": false,
                                "tag": "filter"
                            }
                        ],
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 8,
                                    "character": 16
                                },
                                "end": {
                                    "line": 8,
                                    "character": 22
                                }
                            },
                            "endTagRange": {
                                "start": {
                                    "line": 27,
                                    "character": 16
                                },
                                "end": {
                                    "line": 27,
                                    "character": 23
                                }
                            }
                        },
                        "hasTextNode": false,
                        "selfClosed": false,
                        "tag": "else"
                    },
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 4,
                                "character": 12
                            },
                            "end": {
                                "line": 4,
                                "character": 20
                            }
                        },
                        "endTagRange": {
                            "start": {
                                "line": 28,
                                "character": 12
                            },
                            "end": {
                                "line": 28,
                                "character": 21
                            }
                        }
                    },
                    "hasTextNode": false,
                    "selfClosed": false,
                    "tag": "filter"
                }
            ],
            "range": {
                "startTagRange": {
                    "start": {
                        "line": 3,
                        "character": 8
                    },
                    "end": {
                        "line": 3,
                        "character": 20
                    }
                },
                "endTagRange": {
                    "start": {
                        "line": 29,
                        "character": 8
                    },
                    "end": {
                        "line": 29,
                        "character": 21
                    }
                }
            },
            "hasTextNode": false,
            "selfClosed": false,
            "tag": "inSequence"
        },
        "outSequence": {
            "mediatorList": [],
            "range": {
                "startTagRange": {
                    "start": {
                        "line": 30,
                        "character": 8
                    },
                    "end": {
                        "line": 30,
                        "character": 21
                    }
                },
                "endTagRange": {
                    "start": {
                        "line": 31,
                        "character": 8
                    },
                    "end": {
                        "line": 31,
                        "character": 22
                    }
                }
            },
            "hasTextNode": true,
            "textNode": "\n        ",
            "selfClosed": false,
            "tag": "outSequence"
        },
        "faultSequence": {
            "mediatorList": [],
            "range": {
                "startTagRange": {
                    "start": {
                        "line": 32,
                        "character": 8
                    },
                    "end": {
                        "line": 32,
                        "character": 23
                    }
                },
                "endTagRange": {
                    "start": {
                        "line": 33,
                        "character": 8
                    },
                    "end": {
                        "line": 33,
                        "character": 24
                    }
                }
            },
            "hasTextNode": true,
            "textNode": "\n        ",
            "selfClosed": false,
            "tag": "faultSequence"
        },
        "methods": [
            "GET"
        ],
        "uriTemplate": "/resource",
        "range": {
            "startTagRange": {
                "start": {
                    "line": 2,
                    "character": 4
                },
                "end": {
                    "line": 2,
                    "character": 53
                }
            },
            "endTagRange": {
                "start": {
                    "line": 34,
                    "character": 4
                },
                "end": {
                    "line": 34,
                    "character": 15
                }
            }
        },
        "hasTextNode": false,
        "selfClosed": false,
        "tag": "resource"
    }
};

export const Clone: Story = {};
Clone.args = {
    model: {
        "mediatorList": [
            {
                "key": "gg",
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 2,
                            "character": 4
                        },
                        "end": {
                            "line": 2,
                            "character": 25
                        }
                    },
                    "endTagRange": {}
                },
                "hasTextNode": false,
                "selfClosed": true,
                "tag": "sequence"
            },
            {
                "key": "gg",
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 4,
                            "character": 4
                        },
                        "end": {
                            "line": 4,
                            "character": 25
                        }
                    },
                    "endTagRange": {}
                },
                "hasTextNode": false,
                "selfClosed": true,
                "tag": "sequence"
            },
            {
                "target": [
                    {
                        "sequence": {
                            "mediatorList": [],
                            "range": {
                                "startTagRange": {
                                    "start": {
                                        "line": 7,
                                        "character": 12
                                    },
                                    "end": {
                                        "line": 7,
                                        "character": 24
                                    }
                                },
                                "endTagRange": {}
                            },
                            "hasTextNode": false,
                            "selfClosed": true,
                            "tag": "sequence"
                        },
                        "endpoint": {
                            "http": {
                                "enableSecAndEnableRMAndEnableAddressing": {
                                    "suspendOnFailure": {
                                        "initialDuration": {
                                            "range": {
                                                "startTagRange": {
                                                    "start": {
                                                        "line": 11,
                                                        "character": 24
                                                    },
                                                    "end": {
                                                        "line": 11,
                                                        "character": 41
                                                    }
                                                },
                                                "endTagRange": {
                                                    "start": {
                                                        "line": 11,
                                                        "character": 43
                                                    },
                                                    "end": {
                                                        "line": 11,
                                                        "character": 61
                                                    }
                                                }
                                            },
                                            "hasTextNode": true,
                                            "textNode": "-1",
                                            "selfClosed": false,
                                            "tag": "initialDuration"
                                        },
                                        "progressionFactor": {
                                            "range": {
                                                "startTagRange": {
                                                    "start": {
                                                        "line": 12,
                                                        "character": 24
                                                    },
                                                    "end": {
                                                        "line": 12,
                                                        "character": 43
                                                    }
                                                },
                                                "endTagRange": {
                                                    "start": {
                                                        "line": 12,
                                                        "character": 45
                                                    },
                                                    "end": {
                                                        "line": 12,
                                                        "character": 65
                                                    }
                                                }
                                            },
                                            "hasTextNode": true,
                                            "textNode": "-1",
                                            "selfClosed": false,
                                            "tag": "progressionFactor"
                                        },
                                        "maximumDuration": {
                                            "range": {
                                                "startTagRange": {
                                                    "start": {
                                                        "line": 13,
                                                        "character": 24
                                                    },
                                                    "end": {
                                                        "line": 13,
                                                        "character": 41
                                                    }
                                                },
                                                "endTagRange": {
                                                    "start": {
                                                        "line": 13,
                                                        "character": 42
                                                    },
                                                    "end": {
                                                        "line": 13,
                                                        "character": 60
                                                    }
                                                }
                                            },
                                            "hasTextNode": true,
                                            "textNode": "0",
                                            "selfClosed": false,
                                            "tag": "maximumDuration"
                                        },
                                        "range": {
                                            "startTagRange": {
                                                "start": {
                                                    "line": 10,
                                                    "character": 20
                                                },
                                                "end": {
                                                    "line": 10,
                                                    "character": 38
                                                }
                                            },
                                            "endTagRange": {
                                                "start": {
                                                    "line": 14,
                                                    "character": 20
                                                },
                                                "end": {
                                                    "line": 14,
                                                    "character": 39
                                                }
                                            }
                                        },
                                        "hasTextNode": false,
                                        "selfClosed": false,
                                        "tag": "suspendOnFailure"
                                    },
                                    "markForSuspension": {
                                        "retriesBeforeSuspension": {
                                            "range": {
                                                "startTagRange": {
                                                    "start": {
                                                        "line": 16,
                                                        "character": 24
                                                    },
                                                    "end": {
                                                        "line": 16,
                                                        "character": 49
                                                    }
                                                },
                                                "endTagRange": {
                                                    "start": {
                                                        "line": 16,
                                                        "character": 50
                                                    },
                                                    "end": {
                                                        "line": 16,
                                                        "character": 76
                                                    }
                                                }
                                            },
                                            "hasTextNode": true,
                                            "textNode": "0",
                                            "selfClosed": false,
                                            "tag": "retriesBeforeSuspension"
                                        },
                                        "range": {
                                            "startTagRange": {
                                                "start": {
                                                    "line": 15,
                                                    "character": 20
                                                },
                                                "end": {
                                                    "line": 15,
                                                    "character": 39
                                                }
                                            },
                                            "endTagRange": {
                                                "start": {
                                                    "line": 17,
                                                    "character": 20
                                                },
                                                "end": {
                                                    "line": 17,
                                                    "character": 40
                                                }
                                            }
                                        },
                                        "hasTextNode": false,
                                        "selfClosed": false,
                                        "tag": "markForSuspension"
                                    },
                                    "hasTextNode": false,
                                    "selfClosed": false
                                },
                                "method": "get",
                                "range": {
                                    "startTagRange": {
                                        "start": {
                                            "line": 9,
                                            "character": 16
                                        },
                                        "end": {
                                            "line": 9,
                                            "character": 35
                                        }
                                    },
                                    "endTagRange": {
                                        "start": {
                                            "line": 18,
                                            "character": 16
                                        },
                                        "end": {
                                            "line": 18,
                                            "character": 23
                                        }
                                    }
                                },
                                "hasTextNode": false,
                                "selfClosed": false,
                                "tag": "http"
                            },
                            "property": [],
                            "parameter": [],
                            "type": "HTTP_ENDPOINT",
                            "range": {
                                "startTagRange": {
                                    "start": {
                                        "line": 8,
                                        "character": 12
                                    },
                                    "end": {
                                        "line": 8,
                                        "character": 22
                                    }
                                },
                                "endTagRange": {
                                    "start": {
                                        "line": 19,
                                        "character": 12
                                    },
                                    "end": {
                                        "line": 19,
                                        "character": 23
                                    }
                                }
                            },
                            "hasTextNode": false,
                            "selfClosed": false,
                            "tag": "endpoint"
                        },
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 6,
                                    "character": 8
                                },
                                "end": {
                                    "line": 6,
                                    "character": 16
                                }
                            },
                            "endTagRange": {
                                "start": {
                                    "line": 20,
                                    "character": 8
                                },
                                "end": {
                                    "line": 20,
                                    "character": 17
                                }
                            }
                        },
                        "hasTextNode": false,
                        "selfClosed": false,
                        "tag": "target"
                    },
                    {
                        "sequence": {
                            "mediatorList": [
                                {
                                    "property": [],
                                    "range": {
                                        "startTagRange": {
                                            "start": {
                                                "line": 23,
                                                "character": 16
                                            },
                                            "end": {
                                                "line": 23,
                                                "character": 23
                                            }
                                        },
                                        "endTagRange": {}
                                    },
                                    "hasTextNode": false,
                                    "selfClosed": true,
                                    "tag": "log"
                                },
                                {
                                    "property": [],
                                    "range": {
                                        "startTagRange": {
                                            "start": {
                                                "line": 24,
                                                "character": 16
                                            },
                                            "end": {
                                                "line": 24,
                                                "character": 23
                                            }
                                        },
                                        "endTagRange": {}
                                    },
                                    "hasTextNode": false,
                                    "selfClosed": true,
                                    "tag": "log"
                                }
                            ],
                            "range": {
                                "startTagRange": {
                                    "start": {
                                        "line": 22,
                                        "character": 12
                                    },
                                    "end": {
                                        "line": 22,
                                        "character": 22
                                    }
                                },
                                "endTagRange": {
                                    "start": {
                                        "line": 25,
                                        "character": 12
                                    },
                                    "end": {
                                        "line": 25,
                                        "character": 23
                                    }
                                }
                            },
                            "hasTextNode": false,
                            "selfClosed": false,
                            "tag": "sequence"
                        },
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 21,
                                    "character": 8
                                },
                                "end": {
                                    "line": 21,
                                    "character": 16
                                }
                            },
                            "endTagRange": {
                                "start": {
                                    "line": 26,
                                    "character": 8
                                },
                                "end": {
                                    "line": 26,
                                    "character": 17
                                }
                            }
                        },
                        "hasTextNode": false,
                        "selfClosed": false,
                        "tag": "target"
                    },
                    {
                        "sequenceAttribute": "sss",
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 27,
                                    "character": 8
                                },
                                "end": {
                                    "line": 27,
                                    "character": 33
                                }
                            },
                            "endTagRange": {}
                        },
                        "hasTextNode": false,
                        "selfClosed": true,
                        "tag": "target"
                    }
                ],
                "continueParent": false,
                "sequential": false,
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 5,
                            "character": 4
                        },
                        "end": {
                            "line": 5,
                            "character": 11
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 28,
                            "character": 4
                        },
                        "end": {
                            "line": 28,
                            "character": 12
                        }
                    }
                },
                "hasTextNode": false,
                "selfClosed": false,
                "tag": "clone"
            },
            {
                "key": "gg",
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 29,
                            "character": 4
                        },
                        "end": {
                            "line": 29,
                            "character": 25
                        }
                    },
                    "endTagRange": {}
                },
                "hasTextNode": false,
                "selfClosed": true,
                "tag": "sequence"
            },
            {
                "key": "gg",
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 30,
                            "character": 4
                        },
                        "end": {
                            "line": 30,
                            "character": 25
                        }
                    },
                    "endTagRange": {}
                },
                "hasTextNode": false,
                "selfClosed": true,
                "tag": "sequence"
            }
        ],
        "name": "giga",
        "trace": "disable",
        "range": {
            "startTagRange": {
                "start": {
                    "line": 1,
                    "character": 0
                },
                "end": {
                    "line": 1,
                    "character": 78
                }
            },
            "endTagRange": {
                "start": {
                    "line": 31,
                    "character": 0
                },
                "end": {
                    "line": 31,
                    "character": 11
                }
            }
        },
        "hasTextNode": false,
        "selfClosed": false,
        "tag": "sequence"
    }
}

export const NamedSequence: Story = {};
NamedSequence.args = {
    model: {
        "faultSequence": {
            "mediatorList": [],
            "range": {
                "startTagRange": {
                    "start": {
                        "line": 4,
                        "character": 8
                    },
                    "end": {
                        "line": 4,
                        "character": 23
                    }
                },
                "endTagRange": {
                    "start": {
                        "line": 5,
                        "character": 8
                    },
                    "end": {
                        "line": 5,
                        "character": 24
                    }
                }
            },
            "hasTextNode": true,
            "textNode": "\n        ",
            "selfClosed": false,
            "tag": "faultSequence"
        },
        "methods": [
            "GET"
        ],
        "inSequenceAttribute": "giga",
        "uriTemplate": "/resource",
        "range": {
            "startTagRange": {
                "start": {
                    "line": 2,
                    "character": 4
                },
                "end": {
                    "line": 2,
                    "character": 71
                }
            },
            "endTagRange": {
                "start": {
                    "line": 6,
                    "character": 4
                },
                "end": {
                    "line": 6,
                    "character": 15
                }
            }
        },
        "hasTextNode": false,
        "selfClosed": false,
        "tag": "resource"
    }
}

export const Switch: Story = {};
Switch.args = {
    model: {
        "mediatorList": [
            {
                "_case": [
                    {
                        "mediatorList": [
                            {
                                "then": {
                                    "mediatorList": [
                                        {
                                            "scope": "default",
                                            "type": "STRING",
                                            "group": 0,
                                            "name": "namePart",
                                            "expression": "fn:concat(get-property('policyContract'), '_', get-property('policyNumber'), '_', get-property('transactionId'), '_', get-property('systemId'))",
                                            "range": {
                                                "startTagRange": {
                                                    "start": {
                                                        "line": 6,
                                                        "character": 20
                                                    },
                                                    "end": {
                                                        "line": 6,
                                                        "character": 234
                                                    }
                                                },
                                                "endTagRange": {}
                                            },
                                            "hasTextNode": false,
                                            "selfClosed": true,
                                            "tag": "property"
                                        }
                                    ],
                                    "range": {
                                        "startTagRange": {
                                            "start": {
                                                "line": 5,
                                                "character": 16
                                            },
                                            "end": {
                                                "line": 5,
                                                "character": 22
                                            }
                                        },
                                        "endTagRange": {
                                            "start": {
                                                "line": 7,
                                                "character": 16
                                            },
                                            "end": {
                                                "line": 7,
                                                "character": 23
                                            }
                                        }
                                    },
                                    "hasTextNode": false,
                                    "selfClosed": false,
                                    "tag": "then"
                                },
                                "else_": {
                                    "mediatorList": [
                                        {
                                            "scope": "default",
                                            "type": "STRING",
                                            "group": 0,
                                            "name": "namePart",
                                            "expression": "fn:concat(get-property('transactionId'), '_', get-property('systemId'))",
                                            "range": {
                                                "startTagRange": {
                                                    "start": {
                                                        "line": 9,
                                                        "character": 20
                                                    },
                                                    "end": {
                                                        "line": 9,
                                                        "character": 162
                                                    }
                                                },
                                                "endTagRange": {}
                                            },
                                            "hasTextNode": false,
                                            "selfClosed": true,
                                            "tag": "property"
                                        }
                                    ],
                                    "range": {
                                        "startTagRange": {
                                            "start": {
                                                "line": 8,
                                                "character": 16
                                            },
                                            "end": {
                                                "line": 8,
                                                "character": 22
                                            }
                                        },
                                        "endTagRange": {
                                            "start": {
                                                "line": 10,
                                                "character": 16
                                            },
                                            "end": {
                                                "line": 10,
                                                "character": 23
                                            }
                                        }
                                    },
                                    "hasTextNode": false,
                                    "selfClosed": false,
                                    "tag": "else"
                                },
                                "xpath": "get-property('policyContract') != '' and get-property('policyNumber') != ''",
                                "range": {
                                    "startTagRange": {
                                        "start": {
                                            "line": 4,
                                            "character": 12
                                        },
                                        "end": {
                                            "line": 4,
                                            "character": 104
                                        }
                                    },
                                    "endTagRange": {
                                        "start": {
                                            "line": 11,
                                            "character": 12
                                        },
                                        "end": {
                                            "line": 11,
                                            "character": 21
                                        }
                                    }
                                },
                                "hasTextNode": false,
                                "selfClosed": false,
                                "tag": "filter"
                            }
                        ],
                        "regex": "PC",
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 3,
                                    "character": 8
                                },
                                "end": {
                                    "line": 3,
                                    "character": 25
                                }
                            },
                            "endTagRange": {
                                "start": {
                                    "line": 12,
                                    "character": 8
                                },
                                "end": {
                                    "line": 12,
                                    "character": 15
                                }
                            }
                        },
                        "hasTextNode": false,
                        "selfClosed": false,
                        "tag": "case"
                    },
                    {
                        "mediatorList": [
                            {
                                "scope": "default",
                                "type": "STRING",
                                "group": 0,
                                "name": "systemId",
                                "expression": "//ns0:PIClaimsDocRequest/ns0:PostProcessing/ns0:SystemID/text()",
                                "range": {
                                    "startTagRange": {
                                        "start": {
                                            "line": 15,
                                            "character": 12
                                        },
                                        "end": {
                                            "line": 15,
                                            "character": 235
                                        }
                                    },
                                    "endTagRange": {}
                                },
                                "hasTextNode": false,
                                "selfClosed": true,
                                "tag": "property"
                            }
                        ],
                        "regex": "CC",
                        "range": {
                            "startTagRange": {
                                "start": {
                                    "line": 14,
                                    "character": 8
                                },
                                "end": {
                                    "line": 14,
                                    "character": 25
                                }
                            },
                            "endTagRange": {
                                "start": {
                                    "line": 17,
                                    "character": 8
                                },
                                "end": {
                                    "line": 17,
                                    "character": 15
                                }
                            }
                        },
                        "hasTextNode": false,
                        "selfClosed": false,
                        "tag": "case"
                    }
                ],
                "_default": {
                    "mediatorList": [],
                    "range": {
                        "startTagRange": {
                            "start": {
                                "line": 18,
                                "character": 8
                            },
                            "end": {
                                "line": 18,
                                "character": 18
                            }
                        },
                        "endTagRange": {}
                    },
                    "hasTextNode": false,
                    "selfClosed": true,
                    "tag": "default"
                },
                "source": "get-property('centerType')",
                "range": {
                    "startTagRange": {
                        "start": {
                            "line": 2,
                            "character": 4
                        },
                        "end": {
                            "line": 2,
                            "character": 48
                        }
                    },
                    "endTagRange": {
                        "start": {
                            "line": 19,
                            "character": 4
                        },
                        "end": {
                            "line": 19,
                            "character": 13
                        }
                    }
                },
                "hasTextNode": false,
                "selfClosed": false,
                "tag": "switch"
            }
        ],
        "name": "pnc-doc-generation-get-file-name-sequence",
        "trace": "disable",
        "range": {
            "startTagRange": {
                "start": {
                    "line": 1,
                    "character": 0
                },
                "end": {
                    "line": 1,
                    "character": 115
                }
            },
            "endTagRange": {
                "start": {
                    "line": 20,
                    "character": 0
                },
                "end": {
                    "line": 20,
                    "character": 11
                }
            }
        },
        "hasTextNode": false,
        "selfClosed": false,
        "tag": "sequence"
    }
}
